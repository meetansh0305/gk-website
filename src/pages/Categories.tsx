import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";

export default function Categories() {
  const [categories, setCategories] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      console.error("Error loading categories:", error);
      return;
    }

    setCategories(data ?? []);
  };

  return (
    <div className="container">
      <h2 className="section-title">Categories</h2>

      {categories.length === 0 && <p>No categories added yet.</p>}

      <div className="grid">
        {categories.map((category) => (
          <div
            key={category.id}
            className="card"
            style={{ cursor: "pointer" }}
            onClick={() => navigate(`/categories/${category.id}`)}
          >
            <div style={{ fontWeight: 600, fontSize: "16px" }}>
              {category.name}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
