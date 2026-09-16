import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Navbar } from "../components/Navbar";
import { Button } from "../components/ui/button";
import { FileText, Sparkles, Plus } from "lucide-react";
import { toast } from "sonner";

const BACKEND_URL = import.meta.env.VITE_APP_BACKEND_URL || "http://localhost:5000";

export const Dashboard = ({ user, setUser }) => {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchMaterials = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${BACKEND_URL}/api/materials`);
      setMaterials(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error("Failed to load materials");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar user={user} setUser={setUser} />

      <main className="flex-1 max-w-7xl mx-auto w-full p-8 space-y-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-card border rounded-2xl p-6 shadow-sm">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Global Study Resources</h2>
            <p className="text-sm text-muted-foreground">Browse community materials or open AI Test Preparation to study for an exam.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={() => navigate("/ai-study")} className="rounded-xl bg-gradient-to-r from-indigo-600 to-primary font-semibold gap-2">
              <Sparkles className="w-4 h-4 text-amber-300 fill-amber-300" />
              AI Test Preparation
            </Button>
            <Button onClick={() => navigate("/upload")} variant="outline" className="rounded-xl gap-2">
              <Plus className="w-4 h-4" /> Share Material
            </Button>
          </div>
        </div>

        {loading ? (
          <p className="text-center py-20 text-muted-foreground font-medium">Loading resources...</p>
        ) : materials.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed rounded-2xl bg-card p-12 space-y-4">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground/50" />
            <h3 className="text-lg font-semibold">No materials found</h3>
            <p className="text-muted-foreground mb-6">Be the first to share a study guide!</p>
            <Button onClick={() => navigate("/upload")}>Upload Now</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {materials.map((m) => (
              <div key={m._id} className="p-6 border rounded-2xl bg-card hover:shadow-md transition-all flex flex-col justify-between space-y-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-secondary text-secondary-foreground mb-2 inline-block">
                    {m.subject}
                  </span>
                  <h3 className="font-bold text-lg leading-tight line-clamp-1">{m.title}</h3>
                  {m.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                      {m.description}
                    </p>
                  )}
                </div>
                <div className="pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
                  <span>By {m.uploader_name || "Anonymous"}</span>
                  <Button variant="link" className="p-0 h-auto font-semibold text-primary" onClick={() => navigate(`/material/${m._id}`)}>
                    View Document →
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};