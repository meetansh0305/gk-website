interface LoadingSpinnerProps {
  size?: "small" | "medium" | "large";
  fullScreen?: boolean;
  message?: string;
}

export default function LoadingSpinner({ 
  size = "medium", 
  fullScreen = false,
  message 
}: LoadingSpinnerProps) {
  const sizeMap = {
    small: 24,
    medium: 40,
    large: 60,
  };

  const spinnerSize = sizeMap[size];

  const spinner = (
    <div style={{ 
      display: "flex", 
      flexDirection: "column",
      alignItems: "center", 
      justifyContent: "center",
      gap: 16,
    }}>
      <div
        style={{
          width: spinnerSize,
          height: spinnerSize,
          border: `4px solid #f3f3f3`,
          borderTop: `4px solid var(--accent, #b08d57)`,
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
        }}
      />
      {message && (
        <p style={{ 
          color: "#666", 
          fontSize: 14, 
          margin: 0,
          textAlign: "center"
        }}>
          {message}
        </p>
      )}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );

  if (fullScreen) {
    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(255, 255, 255, 0.9)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
        }}
      >
        {spinner}
      </div>
    );
  }

  return spinner;
}










