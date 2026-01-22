import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "../components/ui/button";
import { BookOpen, ArrowLeft, Star, Download } from "lucide-react";
import { toast } from "sonner";

const BACKEND_URL = import.meta.env.VITE_APP_BACKEND_URL || "http://localhost:5000";

export const MaterialDetail = ({ user }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [material, setMaterial] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMaterialData = useCallback(async () => {
    try {
      const { data } = await axios.get(`${BACKEND_URL}/api/materials/${id}`);
      setMaterial(data);
    } catch (err) {
      toast.error("Failed to load material");
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchMaterialData();
  }, [fetchMaterialData]);

  if (loading) return <div className="flex items-center justify-center min-h-screen font-medium">Loading Material...</div>;
  if (!material) return null;

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/dashboard")}>
          <BookOpen className="w-8 h-8 text-primary" />
          <h1 className="text-2xl font-bold">Study Hub</h1>
        </div>
        <Button variant="outline" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <section className="bg-card border rounded-xl p-8 shadow-sm">
              <h2 className="text-3xl font-bold mb-4">{material.title}</h2>
              <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
                <span className="bg-secondary px-3 py-1 rounded-lg">{material.subject}</span>
                <span>Uploaded by {material.uploader_name || "Anonymous"}</span>
              </div>
              
              <div className="flex items-center gap-1">
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                {/* SAFE RENDERING: Prevents .toFixed(1) crash on undefined */}
                <span className="text-lg font-semibold">
                  {(material.average_rating ?? 0).toFixed(1)}
                </span>
                <span className="text-sm text-muted-foreground ml-1">
                  ({material.ratings_count ?? 0} ratings)
                </span>
              </div>
            </section>

            <section className="bg-card border rounded-xl p-8 shadow-sm">
              <h3 className="text-xl font-semibold mb-4">PDF Viewer</h3>
              <div className="w-full h-[800px] bg-muted rounded-lg overflow-hidden border">
                {/* Using <object> for better PDF support and delivery */}
                <object
                  data={material.pdf_url}
                  type="application/pdf"
                  width="100%"
                  height="100%"
                >
                  <div className="flex flex-col items-center justify-center h-full p-10 text-center gap-4">
                    <p className="text-muted-foreground">Your browser cannot display this PDF inline.</p>
                    <Button asChild>
                      <a href={material.pdf_url} target="_blank" rel="noopener noreferrer">
                        <Download className="w-4 h-4 mr-2" /> Download to View
                      </a>
                    </Button>
                  </div>
                </object>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};