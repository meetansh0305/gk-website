import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate, useLocation } from "react-router-dom";

// Hook to detect mobile
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth <= 768;
    }
    return false;
  });
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  return isMobile;
};

export default function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup" | "forgot" | "reset">("login");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Profile fields for signup
  const [firmName, setFirmName] = useState("");
  const [fullName, setFullName] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  // Check if user is already logged in - redirect in background (don't block UI)
  // BUT: Don't redirect if this is a password reset link (type=recovery in hash) or verification link
  useEffect(() => {
    let mounted = true;
    
    (async () => {
      try {
        // First check if this is a password reset link or verification link - if so, don't redirect
        const hashParams = window.location.hash;
        const isRecoverySession = sessionStorage.getItem("isRecoverySession") === "true";
        const isVerificationSession = sessionStorage.getItem("isVerificationSession") === "true";
        const hash = hashParams.substring(1);
        const params = new URLSearchParams(hash);
        const type = params.get("type");
        
        if (hashParams.includes("type=recovery") || hashParams.includes("access_token") || isRecoverySession || 
            type === "signup" || isVerificationSession) {
          // This is a password reset or verification link - don't redirect, let the handlers deal with it
          console.log("Auth page: Password reset or verification link detected, skipping redirect check");
          return;
        }
        
        // Check localStorage first to see if session exists
        const projectRef = import.meta.env.VITE_SUPABASE_URL?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
        if (projectRef) {
          const storageKey = `sb-${projectRef}-auth-token`;
          const stored = localStorage.getItem(storageKey);
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              // Check if this is a recovery session (temporary, for password reset only)
              // Recovery sessions should not trigger redirect
              if (parsed.user?.app_metadata?.provider === "email" && parsed.user?.recovery_sent_at) {
                console.log("Auth page: Recovery session detected, skipping redirect");
                return;
              }
              console.log("Auth page: Stored session has user:", parsed.user?.email);
            } catch (e) {
              console.error("Auth page: Could not parse stored session:", e);
            }
          }
        }
        
        // Try to get session from Supabase (with timeout to avoid hanging)
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error("getSession timeout")), 3000);
        });
        
        const { data: { session }, error } = await Promise.race([sessionPromise, timeoutPromise]) as any;
        
        if (!mounted) return;
        
        if (error && error.message !== "getSession timeout") {
          console.error("Error getting session:", error);
          return;
        }
        
        if (session?.user) {
          // Check if this is a recovery session - don't redirect for recovery
          const isRecoverySession = session.user.app_metadata?.provider === "email" && 
                                   (session.user.recovery_sent_at || window.location.hash.includes("type=recovery"));
          
          if (isRecoverySession) {
            console.log("Auth page: Recovery session detected, not redirecting");
            return;
          }
          
          console.log("Auth page: Session found, redirecting...");
          // User is already logged in - redirect them
          const currentSearch = window.location.search;
          const returnTo = new URLSearchParams(currentSearch).get("returnTo") || "/";
          const destination = returnTo && returnTo !== "/auth" ? returnTo : "/";
          navigate(destination, { replace: true });
          return;
        } else if (error?.message === "getSession timeout") {
          console.warn("Auth page: getSession timed out, but session might be in localStorage");
        }
      } catch (error: any) {
        if (error?.message !== "getSession timeout") {
          console.error("Error checking auth:", error);
        }
      }
    })();
    
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Check if user is coming from email verification link
  useEffect(() => {
    const hashParams = window.location.hash;
    if (!hashParams) return;
    
    const hash = hashParams.substring(1); // Remove #
    const params = new URLSearchParams(hash);
    const type = params.get("type");
    
    // Only handle signup/verification links, not recovery links
    if (type === "signup") {
      // This is an email verification link
      // IMPORTANT: Set verification flag IMMEDIATELY to prevent redirect
      sessionStorage.setItem("isVerificationSession", "true");
      
      (async () => {
        try {
          // Wait a moment for Supabase to process the verification
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Check if user was verified
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError) {
            console.error("Error getting verification session:", sessionError);
            sessionStorage.removeItem("isVerificationSession");
            setMsg("Error verifying email. Please try again or request a new verification link.");
            return;
          }
          
          if (session?.user) {
            // Email verified successfully - show success message
            setMode("login");
            setMsg("Email verified successfully! You can now sign in with your email and password.");
            
            // Sign out the temporary verification session
            await supabase.auth.signOut();
            sessionStorage.removeItem("isVerificationSession");
            
            // Clear the hash from URL for cleaner UX
            window.history.replaceState(
              null,
              "",
              window.location.pathname + window.location.search
            );
          } else {
            sessionStorage.removeItem("isVerificationSession");
            setMsg("Verification link may be invalid or expired. Please request a new verification email.");
          }
        } catch (err: any) {
          console.error("Error processing verification link:", err);
          sessionStorage.removeItem("isVerificationSession");
          setMsg("Error processing verification link. Please try again or request a new link.");
        }
      })();
    }
  }, []);

  // Check if user is coming from password reset email
  useEffect(() => {
    const hashParams = window.location.hash;
    if (hashParams.includes("type=recovery") || hashParams.includes("access_token")) {
      // Extract tokens from hash
      const hash = hashParams.substring(1); // Remove #
      const params = new URLSearchParams(hash);
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");
      const type = params.get("type");
      
      // IMPORTANT: Set recovery flag IMMEDIATELY (synchronously) to prevent redirect
      sessionStorage.setItem("isRecoverySession", "true");
      
      if (type === "recovery" && accessToken) {
        // Manually set the session from the recovery token
        (async () => {
          try {
            // Set the session using the tokens from the hash
            const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || "",
            });
            
            if (sessionError) {
              console.error("Error setting recovery session:", sessionError);
              sessionStorage.removeItem("isRecoverySession");
              setMsg("Invalid or expired reset link. Please request a new password reset.");
              return;
            }
            
            if (sessionData.session) {
              // Session set successfully - switch to reset mode
      setMode("reset");
              
              // Clear the hash from URL for cleaner UX (after session is set)
              window.history.replaceState(
                null,
                "",
                window.location.pathname + window.location.search
              );
            } else {
              sessionStorage.removeItem("isRecoverySession");
              setMsg("Failed to establish session. Please request a new password reset.");
            }
          } catch (err: any) {
            console.error("Error processing recovery link:", err);
            sessionStorage.removeItem("isRecoverySession");
            setMsg("Error processing reset link. Please try again or request a new link.");
          }
        })();
      } else {
        // Fallback: let Supabase handle it automatically
      setMode("reset");
        // Wait a bit before clearing hash to let Supabase process it
        setTimeout(() => {
          window.history.replaceState(
            null,
            "",
            window.location.pathname + window.location.search
          );
        }, 1000);
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");
    setLoading(true);

    // Safety: Always clear loading after 30 seconds max
    const loadingTimeout = setTimeout(() => {
      setLoading(false);
      setMsg("Request is taking longer than expected. Please check your connection and try again.");
    }, 30000);
    
    const clearLoading = () => {
      clearTimeout(loadingTimeout);
      setLoading(false);
    };

    try {
      console.log("=== HANDLE SUBMIT START ===", "Mode:", mode);
    if (mode === "forgot") {
      if (!email) {
        setMsg("Email is required.");
          clearLoading();
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        setMsg("Please enter a valid email address.");
        setLoading(false);
        return;
      }

      try {
        const redirectUrl = `${window.location.origin}/auth`;
        console.log("Sending password reset email to:", email);
        console.log("Redirect URL:", redirectUrl);
        console.log("Note: Make sure this URL is added to Supabase Auth → URL Configuration → Redirect URLs");

        // Try with redirectTo first
        let result = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: redirectUrl,
        });

        // If that fails with redirect error, try without redirectTo
        if (result.error && (result.error.message && (result.error.message.includes("redirect") || result.error.message.includes("URL") || result.error.message.includes("whitelist")))) {
          console.log("Redirect URL error detected. Retrying without redirectTo...");
          console.log("Note: You may need to add the redirect URL in Supabase Dashboard → Authentication → URL Configuration");
          result = await supabase.auth.resetPasswordForEmail(email.trim());
        }

        const { error } = result;

        if (error) {
          console.error("Password reset error:", error);
          console.error("Full error object:", JSON.stringify(error, null, 2));
          
          // Provide more user-friendly error messages
          if (error.message.includes("rate limit") || error.message.includes("too many")) {
            setMsg("Too many requests. Please wait a few minutes before trying again.");
          } else if (error.message.includes("not found") || error.message.includes("user")) {
            // For security, don't reveal if email exists - show success message
            setMsg("If an account exists with this email, a password reset link has been sent. Please check your inbox.");
          } else if (error.status === 500 || error.code === "unexpected_failure" || (error.message && error.message.toLowerCase().includes("error sending"))) {
            setMsg("Email service not configured. Please configure email settings in Supabase Dashboard: Go to Authentication → Email Templates and ensure email service is set up, or configure SMTP in Project Settings → Auth.");
          } else if (error.message.includes("email") && error.message.includes("send")) {
            setMsg("Unable to send email. Please check your Supabase email configuration or contact support.");
          } else {
            setMsg(`Error: ${error.message || "Unknown error"}. Please check the browser console for details.`);
          }
          clearLoading();
          return;
        }

        // Success - even if user doesn't exist, we show success for security
        setMsg("If an account exists with this email, a password reset link has been sent. Please check your inbox (and spam folder).");
        clearLoading();
        return;
      } catch (err: any) {
        console.error("Unexpected error during password reset:", err);
        setMsg(`An unexpected error occurred: ${err?.message || "Unknown error"}. Please try again later or contact support.`);
        clearLoading();
        return;
      }
    }

    if (mode === "reset") {
      if (!newPassword || !confirmPassword) {
        setMsg("Both password fields are required.");
        clearLoading();
        return;
      }

      if (newPassword.length < 6) {
        setMsg("Password must be at least 6 characters.");
        clearLoading();
        return;
      }

      if (newPassword !== confirmPassword) {
        setMsg("Passwords do not match.");
        clearLoading();
        return;
      }

      // Get session - try multiple methods due to Supabase client issues
      let session = null;
      
      // Method 1: Try getSession with timeout
      try {
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error("getSession timeout")), 3000);
        });
        
        const { data: sessionData } = await Promise.race([sessionPromise, timeoutPromise]) as any;
        session = sessionData?.session;
      } catch (e) {
        // getSession timed out or failed - try localStorage
        console.log("getSession failed, trying localStorage...");
      }
      
      // Method 2: Check localStorage directly
      if (!session) {
        try {
          const projectRef = import.meta.env.VITE_SUPABASE_URL?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
          if (projectRef) {
            const storageKey = `sb-${projectRef}-auth-token`;
            const stored = localStorage.getItem(storageKey);
            if (stored) {
              const sessionData = JSON.parse(stored);
              if (sessionData.access_token && sessionData.user) {
                // Create a session-like object from localStorage
                session = {
                  access_token: sessionData.access_token,
                  refresh_token: sessionData.refresh_token,
                  user: sessionData.user,
                };
              }
            }
          }
        } catch (e) {
          console.error("Error reading session from localStorage:", e);
        }
      }

      if (!session || !session.access_token) {
        setMsg("Session expired or invalid. Please open the reset link again from your email.");
        clearLoading();
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        setMsg(error.message);
        clearLoading();
        return;
      }

      // Clear the recovery session flag
      sessionStorage.removeItem("isRecoverySession");
      
      // Sign out the recovery session (it was temporary, only for password reset)
      await supabase.auth.signOut();

      setMsg("Password updated successfully! Redirecting to login...");
      setTimeout(() => {
        setMode("login");
        setNewPassword("");
        setConfirmPassword("");
        clearLoading();
      }, 2000);
      return;
    }

    if (!email || !password) {
      setMsg("Email and password required.");
      clearLoading();
      return;
    }

    if (mode === "signup") {
      // Validate required profile fields
      if (!firmName.trim() || !fullName.trim() || !state.trim() || !city.trim() || !phone.trim()) {
        setMsg("Please fill in all required fields (Firm Name, Full Name, State, City, Phone).");
        clearLoading();
        return;
      }

      // Validate password length
      if (password.length < 6) {
        setMsg("Password must be at least 6 characters.");
        clearLoading();
        return;
      }

      // First, check if account already exists by attempting to sign in
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (supabaseUrl && supabaseKey) {
        try {
          // Try to sign in with these credentials
          const testLoginResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseKey,
            },
            body: JSON.stringify({
              email: email.trim(),
              password: password,
            }),
          });
          
          const testLoginData = await testLoginResponse.json();
          
          // If sign in succeeds, account already exists
          if (testLoginResponse.ok && testLoginData.access_token) {
            setMode("login");
            setMsg("This email is already registered. Please sign in instead.");
            clearLoading();
            return;
          }
        } catch (testErr) {
          // If test fails, continue with signup (account probably doesn't exist)
          console.log("Account check: proceeding with signup");
        }
      }
      
      // Create auth account
      const { data: signUpData, error } = await supabase.auth.signUp({ 
        email: email.trim(), 
        password: password 
      });
      
      if (error) {
        // Check error message for duplicate indicators
        const errorMsg = error.message.toLowerCase();
        if (
          errorMsg.includes("user already") ||
          errorMsg.includes("already registered") ||
          errorMsg.includes("email already") ||
          errorMsg.includes("already exists") ||
          error.status === 422 ||
          error.status === 400
        ) {
          setMode("login");
          setMsg("This email is already registered. Please sign in instead.");
          clearLoading();
          return;
        }
        
        setMsg(error.message);
        clearLoading();
        return;
      }

      if (signUpData?.user) {
        // Create profile immediately after auth signup
        const { error: profileError } = await supabase
          .from("profiles")
          .upsert({
            id: signUpData.user.id,
            email: email.trim(),
            firm_name: firmName.trim(),
            full_name: fullName.trim(),
            state: state.trim(),
            city: city.trim(),
            phone: phone.trim() || null,
          } as any, {
            onConflict: 'id'
          });

        if (profileError) {
          console.error("Profile creation error:", profileError);
          // Don't fail signup if profile creation fails - user can complete profile later
          setMsg("Account created but profile setup failed. Please complete your profile after verifying your email.");
        } else {
          setMsg("Signup successful! A verification email has been sent to your email address. Please check your inbox (and spam folder) and click the verification link before signing in. If you didn't receive the email, click 'Resend Verification Email' below.");
        }
        
        clearLoading();
        
        // Reset form and go back to login after 8 seconds (give user time to use resend button)
        setTimeout(() => {
          setMode("login");
          setPassword("");
          setFirmName("");
          setFullName("");
          setState("");
          setCity("");
          setPhone("");
          // Keep email filled in so user can try to login after verifying
        }, 8000);
      return;
    }

      // If no user was created, show error
      setMsg("Signup failed. Please try again.");
      clearLoading();
      return;
    }

    // LOGIN MODE - Using direct fetch to bypass Supabase client session persistence issues
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      clearLoading();
      setMsg("Configuration error: Supabase credentials are missing. Please check your .env file.");
      return;
    }
    
    let result: { data: any; error: any } | null = null;
    try {
      // Direct fetch to Supabase auth endpoint to bypass client session persistence issues
      const authUrl = `${supabaseUrl}/auth/v1/token?grant_type=password`;
      
      const response = await fetch(authUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
        },
        body: JSON.stringify({
          email: email.trim(),
          password: password,
        }),
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        // Check error message to determine the issue
        const errorMessage = (responseData.error_description || responseData.message || responseData.error || '').toLowerCase();
        const errorCode = responseData.error || '';
        
        const isEmailNotConfirmed = 
          errorMessage.includes('email not confirmed') ||
          errorMessage.includes('email not verified') ||
          errorMessage.includes('confirm your email') ||
          errorCode === 'email_not_confirmed';
        
        // For 400/401 errors, check if it's invalid credentials (user doesn't exist or wrong password)
        // Supabase typically returns "Invalid login credentials" for both cases
        const isInvalidCredentials = 
          errorMessage.includes('invalid login credentials') ||
          errorMessage.includes('invalid credentials') ||
          errorMessage.includes('invalid email or password') ||
          (response.status === 400 && !isEmailNotConfirmed) ||
          (response.status === 401 && !isEmailNotConfirmed);

        if (isEmailNotConfirmed) {
          // Email not verified - show helpful message
          setMsg("Please verify your email before signing in. Check your inbox for the verification link. If you didn't receive it, you can request a new one.");
          clearLoading();
          return;
        }

        if (isInvalidCredentials) {
          // Check if user exists by trying to look them up
          // For now, assume it's "user doesn't exist" and redirect to signup
          // This is a reasonable assumption since wrong password would also show this
          setMode("signup");
          setMsg("No account found with this email. Please sign up first.");
          clearLoading();
          return;
        }

        // Convert to Supabase error format for other errors
        result = {
          data: null,
          error: {
            message: responseData.error_description || responseData.message || responseData.error || 'Login failed',
            status: response.status,
          }
        };
      } else {
        // Success - manually store session in localStorage to bypass setSession() hang
        if (responseData.access_token && responseData.user) {
          // Extract project ref from URL
          const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || 'default';
          const storageKey = `sb-${projectRef}-auth-token`;
          
          // Manually construct and store the session
          const sessionData = {
            access_token: responseData.access_token,
            refresh_token: responseData.refresh_token,
            expires_at: responseData.expires_at || (Math.floor(Date.now() / 1000) + (responseData.expires_in || 3600)),
            expires_in: responseData.expires_in || 3600,
            token_type: responseData.token_type || 'bearer',
            user: responseData.user,
          };
          
          // Store session in localStorage using Supabase's expected format
          localStorage.setItem(storageKey, JSON.stringify(sessionData));
          
          // Dispatch a custom event that components can listen to
          window.dispatchEvent(new CustomEvent('supabase-auth-change', {
            detail: {
              user: sessionData.user,
              email: sessionData.user?.email,
              access_token: sessionData.access_token
            }
          }));
          
          const returnTo = new URLSearchParams(location.search).get("returnTo");
          const destination = returnTo && returnTo !== "/auth" ? returnTo : "/";
          
          clearLoading();
          
          // Reload page so Supabase client picks up the session
          window.location.href = destination;
          
          return;
        } else {
          result = {
            data: null,
            error: {
              message: 'Invalid response from server',
              status: 500,
            }
          };
        }
      }
      
      console.log("Step 7: Result prepared:", result);
    } catch (loginError: any) {
      console.error("Step 3 ERROR:", loginError);
      console.error("Error details:", {
        message: loginError.message,
        name: loginError.name,
        stack: loginError.stack
      });
      clearLoading();
      setMsg(loginError.message || "Login failed. Please try again.");
      return;
    }
    
    console.log("Step 5: Processing result...");
    
    if (!result) {
      console.error("Step 5 ERROR: No result");
      clearLoading();
      setMsg("Login failed: No response from server.");
      return;
    }
    
    const { data, error } = result;
    console.log("Step 6: Extracted data and error");

    if (error) {
      console.error("Step 6 ERROR:", error);
      
      // Check error message to determine the issue
      const errorMessage = (error.message || '').toLowerCase();
      const isEmailNotConfirmed = 
        errorMessage.includes('email not confirmed') ||
        errorMessage.includes('email not verified') ||
        errorMessage.includes('confirm your email');
      
      // For invalid credentials, assume user doesn't exist and redirect to signup
      const isInvalidCredentials = 
        errorMessage.includes('invalid login credentials') ||
        errorMessage.includes('invalid credentials') ||
        errorMessage.includes('invalid email or password') ||
        errorMessage.includes('user not found') ||
        (error.status === 400 && !isEmailNotConfirmed) ||
        (error.status === 401 && !isEmailNotConfirmed);

      if (isEmailNotConfirmed) {
        // Email not verified - show helpful message
        setMsg("Please verify your email before signing in. Check your inbox for the verification link. If you didn't receive it, you can request a new one.");
        clearLoading();
      return;
    }

      if (isInvalidCredentials) {
        // User doesn't exist or wrong password - redirect to signup
        setMode("signup");
        setMsg("No account found with this email. Please sign up first.");
        clearLoading();
        return;
      }
      
      clearLoading();
      setMsg(error.message || "Login failed. Please check your credentials.");
      return;
    }

    if (!data || !data.session) {
      console.error("Step 6 ERROR: No session", data);
      clearLoading();
      setMsg("Login failed: No session created. Please try again.");
      return;
    }

    console.log("Step 7: Login successful! Session:", data.session.user?.email);
    
    // Get destination
    const returnTo = new URLSearchParams(location.search).get("returnTo");
    const destination = returnTo && returnTo !== "/auth" ? returnTo : "/";
    console.log("Step 8: Destination:", destination);
    
    // Clear loading and navigate
    console.log("Step 9: Clearing loading...");
    clearLoading();
    console.log("Step 10: Loading cleared, navigating...");
    
    navigate(destination, { replace: true });
    console.log("Step 11: Navigation called");
    } catch (err: any) {
      console.error("Unexpected error in handleSubmit:", err);
      setMsg(err?.message || "An unexpected error occurred. Please try again.");
      clearLoading();
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "grid",
      gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
      background: "#fff"
    }}>
      {/* Left Side - Brand Image */}
      {!isMobile && (
        <div style={{
          background: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url('https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?q=80&w=1200&auto=format&fit=crop') center/cover`,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: 60,
          color: "#fff"
        }}>
          <img 
            src="/logo.png" 
            alt="Gurukrupa Jewellers" 
            style={{ 
              height: 100,
              marginBottom: 40,
              filter: "brightness(0) invert(1)"
            }} 
          />
          <h2 style={{
            fontSize: 36,
            fontWeight: 300,
            marginBottom: 20,
            letterSpacing: "-0.5px",
            textAlign: "center"
          }}>
            Timeless Elegance
          </h2>
          <p style={{
            fontSize: 15,
            lineHeight: 1.8,
            maxWidth: 400,
            textAlign: "center",
            opacity: 0.9,
            fontWeight: 300
          }}>
            Crafting exquisite jewellery since generations. Each piece tells a story of tradition, beauty, and unparalleled craftsmanship.
          </p>
        </div>
      )}

      {/* Right Side - Form */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: isMobile ? "24px 16px" : 60,
        background: "#fafafa",
        minHeight: isMobile ? "100vh" : "auto"
      }}>
        <div style={{ 
          width: "100%",
          maxWidth: isMobile ? "100%" : 440
        }}>
          
          <h2 style={{ 
            fontSize: isMobile ? 24 : 32,
            fontWeight: 300,
            marginBottom: isMobile ? 8 : 12,
            color: "#1a1a1a",
            letterSpacing: "-0.5px"
          }}>
            {mode === "login" ? "Welcome Back" 
              : mode === "signup" ? "Create Account"
              : mode === "forgot" ? "Reset Password"
              : "Set New Password"}
          </h2>

          <p style={{ 
            color: "#666",
            fontSize: isMobile ? 13 : 14,
            marginBottom: isMobile ? 32 : 48,
            fontWeight: 300
          }}>
            {mode === "login" 
              ? "Sign in to your account" 
              : mode === "signup"
              ? "Begin your journey with us"
              : mode === "forgot"
              ? "Enter your email to receive a password reset link"
              : "Enter your new password"}
          </p>

          {/* Signup Form with all fields */}
          {mode === "signup" ? (
            <form onSubmit={handleSubmit} style={{ display: "grid", gap: isMobile ? 20 : 24 }}>
              <div>
                <label style={{ 
                  display: "block",
                  fontSize: isMobile ? 10 : 11,
                  fontWeight: 600,
                  marginBottom: isMobile ? 8 : 12,
                  color: "#999",
                  letterSpacing: "1px",
                  textTransform: "uppercase"
                }}>
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: isMobile ? "12px 14px" : "14px 16px",
                    borderRadius: 0,
                    border: "1px solid #e8e8e8",
                    fontSize: isMobile ? 16 : 15,
                    transition: "border-color 0.2s ease",
                    background: "#fff",
                    fontWeight: 300
                  }}
                onFocus={(e) => e.currentTarget.style.borderColor = "#1a1a1a"}
                onBlur={(e) => e.currentTarget.style.borderColor = "#e8e8e8"}
              />
            </div>

              <div>
                <label style={{ 
                  display: "block",
                  fontSize: isMobile ? 10 : 11,
                  fontWeight: 600,
                  marginBottom: isMobile ? 8 : 12,
                  color: "#999",
                  letterSpacing: "1px",
                  textTransform: "uppercase"
                }}>
                  Password
                </label>
                <input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: isMobile ? "12px 14px" : "14px 16px",
                    borderRadius: 0,
                    border: "1px solid #e8e8e8",
                    fontSize: isMobile ? 16 : 15,
                    transition: "border-color 0.2s ease",
                    background: "#fff",
                    fontWeight: 300
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = "#1a1a1a"}
                  onBlur={(e) => e.currentTarget.style.borderColor = "#e8e8e8"}
                />
                <div style={{ 
                  fontSize: isMobile ? 11 : 12, 
                  color: "#999",
                  marginTop: 8,
                  fontWeight: 300
                }}>
                  Minimum 6 characters
                </div>
              </div>

              <div>
                <label style={{ 
                  display: "block",
                  fontSize: isMobile ? 10 : 11,
                  fontWeight: 600,
                  marginBottom: isMobile ? 8 : 12,
                  color: "#999",
                  letterSpacing: "1px",
                  textTransform: "uppercase"
                }}>
                  Firm Name <span style={{ color: "#991b1b" }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter your firm name"
                  value={firmName}
                  onChange={(e) => setFirmName(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: isMobile ? "12px 14px" : "14px 16px",
                    borderRadius: 0,
                    border: "1px solid #e8e8e8",
                    fontSize: isMobile ? 16 : 15,
                    transition: "border-color 0.2s ease",
                    background: "#fff",
                    fontWeight: 300
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = "#1a1a1a"}
                  onBlur={(e) => e.currentTarget.style.borderColor = "#e8e8e8"}
                />
              </div>

              <div>
                <label style={{ 
                  display: "block",
                  fontSize: isMobile ? 10 : 11,
                  fontWeight: 600,
                  marginBottom: isMobile ? 8 : 12,
                  color: "#999",
                  letterSpacing: "1px",
                  textTransform: "uppercase"
                }}>
                  Full Name <span style={{ color: "#991b1b" }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: isMobile ? "12px 14px" : "14px 16px",
                    borderRadius: 0,
                    border: "1px solid #e8e8e8",
                    fontSize: isMobile ? 16 : 15,
                    transition: "border-color 0.2s ease",
                    background: "#fff",
                    fontWeight: 300
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = "#1a1a1a"}
                  onBlur={(e) => e.currentTarget.style.borderColor = "#e8e8e8"}
                />
              </div>

              <div>
                <label style={{ 
                  display: "block",
                  fontSize: isMobile ? 10 : 11,
                  fontWeight: 600,
                  marginBottom: isMobile ? 8 : 12,
                  color: "#999",
                  letterSpacing: "1px",
                  textTransform: "uppercase"
                }}>
                  State <span style={{ color: "#991b1b" }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter your state"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: isMobile ? "12px 14px" : "14px 16px",
                    borderRadius: 0,
                    border: "1px solid #e8e8e8",
                    fontSize: isMobile ? 16 : 15,
                    transition: "border-color 0.2s ease",
                    background: "#fff",
                    fontWeight: 300
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = "#1a1a1a"}
                  onBlur={(e) => e.currentTarget.style.borderColor = "#e8e8e8"}
                />
              </div>

              <div>
                <label style={{ 
                  display: "block",
                  fontSize: isMobile ? 10 : 11,
                  fontWeight: 600,
                  marginBottom: isMobile ? 8 : 12,
                  color: "#999",
                  letterSpacing: "1px",
                  textTransform: "uppercase"
                }}>
                  City <span style={{ color: "#991b1b" }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="Enter your city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: isMobile ? "12px 14px" : "14px 16px",
                    borderRadius: 0,
                    border: "1px solid #e8e8e8",
                    fontSize: isMobile ? 16 : 15,
                    transition: "border-color 0.2s ease",
                    background: "#fff",
                    fontWeight: 300
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = "#1a1a1a"}
                  onBlur={(e) => e.currentTarget.style.borderColor = "#e8e8e8"}
                />
              </div>

              <div>
                <label style={{ 
                  display: "block",
                  fontSize: isMobile ? 10 : 11,
                  fontWeight: 600,
                  marginBottom: isMobile ? 8 : 12,
                  color: "#999",
                  letterSpacing: "1px",
                  textTransform: "uppercase"
                }}>
                  Phone Number <span style={{ color: "#991b1b" }}>*</span>
                </label>
                <input
                  type="tel"
                  placeholder="Enter your phone number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: isMobile ? "12px 14px" : "14px 16px",
                    borderRadius: 0,
                    border: "1px solid #e8e8e8",
                    fontSize: isMobile ? 16 : 15,
                    transition: "border-color 0.2s ease",
                    background: "#fff",
                    fontWeight: 300
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = "#1a1a1a"}
                  onBlur={(e) => e.currentTarget.style.borderColor = "#e8e8e8"}
                />
              </div>

              <button 
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: isMobile ? "14px" : "16px",
                  borderRadius: 0,
                  border: "none",
                  background: loading ? "#999" : "#1a1a1a",
                  color: "#fff",
                  cursor: loading ? "not-allowed" : "pointer",
                  fontSize: isMobile ? 12 : 11,
                  fontWeight: 600,
                  letterSpacing: "1.5px",
                  textTransform: "uppercase",
                  marginTop: isMobile ? 12 : 16,
                  transition: "all 0.3s ease",
                  opacity: loading ? 0.7 : 1
                }}
                onMouseEnter={(e) => {
                  if (!loading) e.currentTarget.style.background = "#000";
                }}
                onMouseLeave={(e) => {
                  if (!loading) e.currentTarget.style.background = "#1a1a1a";
                }}
              >
                {loading ? "Creating Account..." : "Create Account"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: "grid", gap: isMobile ? 20 : 24 }}>
              <div>
                <label style={{ 
                  display: "block",
                  fontSize: isMobile ? 10 : 11,
                  fontWeight: 600,
                  marginBottom: isMobile ? 8 : 12,
                  color: "#999",
                  letterSpacing: "1px",
                  textTransform: "uppercase"
                }}>
                  Email Address
                </label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: "100%",
                  padding: isMobile ? "12px 14px" : "14px 16px",
                  borderRadius: 0,
                  border: "1px solid #e8e8e8",
                  fontSize: isMobile ? 16 : 15,
                  transition: "border-color 0.2s ease",
                  background: "#fff",
                  fontWeight: 300
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = "#1a1a1a"}
                onBlur={(e) => e.currentTarget.style.borderColor = "#e8e8e8"}
              />
            </div>

            {mode !== "forgot" && mode !== "reset" && (
              <div>
                <label style={{ 
                  display: "block",
                  fontSize: isMobile ? 10 : 11,
                  fontWeight: 600,
                  marginBottom: isMobile ? 8 : 12,
                  color: "#999",
                  letterSpacing: "1px",
                  textTransform: "uppercase"
                }}>
                  Password
                </label>
                <input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: "100%",
                    padding: isMobile ? "12px 14px" : "14px 16px",
                    borderRadius: 0,
                    border: "1px solid #e8e8e8",
                    fontSize: isMobile ? 16 : 15,
                    transition: "border-color 0.2s ease",
                    background: "#fff",
                    fontWeight: 300
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = "#1a1a1a"}
                  onBlur={(e) => e.currentTarget.style.borderColor = "#e8e8e8"}
                />
                {mode === "login" && (
                  <div style={{ 
                    marginTop: 12,
                    textAlign: "right"
                  }}>
                    <button
                      type="button"
                      onClick={() => {
                        setMode("forgot");
                        setPassword("");
                        setMsg("");
                      }}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "#1a1a1a",
                        cursor: "pointer",
                        fontSize: isMobile ? 11 : 12,
                        fontWeight: 400,
                        textDecoration: "underline",
                        padding: 0
                      }}
                    >
                      Forgot password?
                    </button>
                  </div>
                )}
              </div>
            )}

            {mode === "reset" && (
              <>
                <div>
                  <label style={{ 
                    display: "block",
                    fontSize: isMobile ? 10 : 11,
                    fontWeight: 600,
                    marginBottom: isMobile ? 8 : 12,
                    color: "#999",
                    letterSpacing: "1px",
                    textTransform: "uppercase"
                  }}>
                    New Password
                  </label>
                  <input
                    type="password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    style={{
                      width: "100%",
                      padding: isMobile ? "12px 14px" : "14px 16px",
                      borderRadius: 0,
                      border: "1px solid #e8e8e8",
                      fontSize: isMobile ? 16 : 15,
                      transition: "border-color 0.2s ease",
                      background: "#fff",
                      fontWeight: 300
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = "#1a1a1a"}
                    onBlur={(e) => e.currentTarget.style.borderColor = "#e8e8e8"}
                  />
                  <div style={{ 
                    fontSize: isMobile ? 11 : 12, 
                    color: "#999",
                    marginTop: 8,
                    fontWeight: 300
                  }}>
                    Minimum 6 characters
                  </div>
                </div>

                <div>
                  <label style={{ 
                    display: "block",
                    fontSize: isMobile ? 10 : 11,
                    fontWeight: 600,
                    marginBottom: isMobile ? 8 : 12,
                    color: "#999",
                    letterSpacing: "1px",
                    textTransform: "uppercase"
                  }}>
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    style={{
                      width: "100%",
                      padding: isMobile ? "12px 14px" : "14px 16px",
                      borderRadius: 0,
                      border: "1px solid #e8e8e8",
                      fontSize: isMobile ? 16 : 15,
                      transition: "border-color 0.2s ease",
                      background: "#fff",
                      fontWeight: 300
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = "#1a1a1a"}
                    onBlur={(e) => e.currentTarget.style.borderColor = "#e8e8e8"}
                  />
                </div>
              </>
            )}

            <button 
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: isMobile ? "14px" : "16px",
                borderRadius: 0,
                border: "none",
                background: loading ? "#999" : "#1a1a1a",
                color: "#fff",
                cursor: loading ? "not-allowed" : "pointer",
                fontSize: isMobile ? 12 : 11,
                fontWeight: 600,
                letterSpacing: "1.5px",
                textTransform: "uppercase",
                marginTop: isMobile ? 12 : 16,
                transition: "all 0.3s ease",
                opacity: loading ? 0.7 : 1
              }}
              onMouseEnter={(e) => {
                if (!loading) e.currentTarget.style.background = "#000";
              }}
              onMouseLeave={(e) => {
                if (!loading) e.currentTarget.style.background = "#1a1a1a";
              }}
            >
              {loading 
                ? "Processing..." 
                : mode === "login" 
                ? "Sign In" 
                : mode === "forgot"
                ? "Send Reset Link"
                : "Update Password"}
            </button>
          </form>
          )}

          {msg && (
            <div style={{ 
              marginTop: isMobile ? 20 : 24,
              padding: isMobile ? "12px 14px" : "14px 16px",
              borderRadius: 0,
              background: msg.includes("successful") ? "#f0f9f4" : "#fef2f2",
              color: msg.includes("successful") ? "#166534" : "#991b1b",
              fontSize: isMobile ? 12 : 13,
              border: `1px solid ${msg.includes("successful") ? "#bbf7d0" : "#fecaca"}`,
              fontWeight: 300
            }}>
              {msg}
              {msg.includes("verification email") && email && (
                <div style={{ marginTop: 12 }}>
                  <button
                    type="button"
                    onClick={async () => {
                      setLoading(true);
                      setMsg("");
                      try {
                        const { error } = await supabase.auth.resend({
                          type: 'signup',
                          email: email.trim(),
                        });
                        if (error) {
                          setMsg(`Failed to resend email: ${error.message}`);
                        } else {
                          setMsg("Verification email resent! Please check your inbox (and spam folder).");
                        }
                      } catch (err: any) {
                        setMsg(`Error: ${err?.message || "Failed to resend email"}`);
                      } finally {
                        setLoading(false);
                      }
                    }}
                    style={{
                      background: "transparent",
                      border: "1px solid currentColor",
                      color: "inherit",
                      padding: isMobile ? "6px 12px" : "8px 16px",
                      fontSize: isMobile ? 11 : 12,
                      cursor: "pointer",
                      borderRadius: 0,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      marginTop: 8
                    }}
                  >
                    Resend Verification Email
                  </button>
                </div>
              )}
            </div>
          )}

          {(mode === "login" || mode === "signup") && (
            <div style={{ 
              marginTop: isMobile ? 32 : 40,
              textAlign: "center",
              paddingTop: isMobile ? 24 : 32,
              borderTop: "1px solid #e8e8e8"
            }}>
              <span style={{ color: "#666", fontSize: isMobile ? 13 : 14, fontWeight: 300 }}>
                {mode === "login" ? "Don't have an account?" : "Already have an account?"}
              </span>
              <button 
                onClick={() => {
                  setMode(mode === "login" ? "signup" : "login");
                  setMsg("");
                  setFirmName("");
                  setFullName("");
                  setState("");
                  setCity("");
                  setPhone("");
                }}
                style={{
                  marginLeft: 8,
                  background: "transparent",
                  border: "none",
                  color: "#1a1a1a",
                  cursor: "pointer",
                  fontSize: isMobile ? 13 : 14,
                  fontWeight: 600,
                  textDecoration: "underline"
                }}
              >
                {mode === "login" ? "Sign Up" : "Sign In"}
              </button>
            </div>
          )}

          {mode === "forgot" && (
            <div style={{ 
              marginTop: isMobile ? 32 : 40,
              textAlign: "center",
              paddingTop: isMobile ? 24 : 32,
              borderTop: "1px solid #e8e8e8"
            }}>
              <span style={{ color: "#666", fontSize: isMobile ? 13 : 14, fontWeight: 300 }}>
                Remember your password?
              </span>
              <button 
                onClick={() => {
                  setMode("login");
                  setMsg("");
                  setEmail("");
                }}
                style={{
                  marginLeft: 8,
                  background: "transparent",
                  border: "none",
                  color: "#1a1a1a",
                  cursor: "pointer",
                  fontSize: isMobile ? 13 : 14,
                  fontWeight: 600,
                  textDecoration: "underline"
                }}
              >
                Sign In
              </button>
            </div>
          )}

          {mode === "reset" && (
            <div style={{ 
              marginTop: isMobile ? 32 : 40,
              textAlign: "center",
              paddingTop: isMobile ? 24 : 32,
              borderTop: "1px solid #e8e8e8"
            }}>
              <span style={{ color: "#666", fontSize: isMobile ? 13 : 14, fontWeight: 300 }}>
                Remember your password?
              </span>
              <button 
                onClick={() => {
                  setMode("login");
                  setMsg("");
                  setNewPassword("");
                  setConfirmPassword("");
                }}
                style={{
                  marginLeft: 8,
                  background: "transparent",
                  border: "none",
                  color: "#1a1a1a",
                  cursor: "pointer",
                  fontSize: isMobile ? 13 : 14,
                  fontWeight: 600,
                  textDecoration: "underline"
                }}
              >
                Sign In
              </button>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}