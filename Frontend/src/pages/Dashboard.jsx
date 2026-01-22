import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { BookOpen, Upload, LogOut, FileText } from "lucide-react";
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
      // Force array type to prevent .map crashes
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

  const handleLogout = () => {
    localStorage.clear();
    setUser(null);
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-card px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="text-primary w-8 h-8" />
          <h1 className="text-xl font-bold">Study Hub</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm">Hi, {user?.name || "User"}</span>
          <Button onClick={() => navigate("/upload")} size="sm">
            <Upload className="w-4 h-4 mr-2" /> Upload
          </Button>
          <Button variant="outline" onClick={handleLogout} size="sm">
            <LogOut className="w-4 h-4 mr-2" /> Logout
          </Button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-8">
        {loading ? (
          <p className="text-center py-20">Loading resources...</p>
        ) : materials.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed rounded-xl">
            <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold">No materials found</h3>
            <p className="text-muted-foreground mb-6">Be the first to share a study guide!</p>
            <Button onClick={() => navigate("/upload")}>Upload Now</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {materials.map((m) => (
              <div key={m._id} className="p-6 border rounded-xl bg-card hover:shadow-md transition-shadow">
                <h3 className="font-bold text-lg mb-1">{m.title}</h3>
                <p className="text-sm text-muted-foreground mb-4">{m.subject}</p>
                <Button variant="link" className="p-0 h-auto" onClick={() => navigate(`/material/${m._id}`)}>
                  View Document →
                </Button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};