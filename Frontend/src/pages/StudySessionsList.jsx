import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Navbar } from "../components/Navbar";
import { CreateSessionModal } from "../components/CreateSessionModal";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { 
  Sparkles, 
  Plus, 
  BookOpen, 
  Calendar, 
  FileText, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ArrowRight,
  Search,
  Trash2
} from "lucide-react";
import { toast } from "sonner";

const BACKEND_URL = import.meta.env.VITE_APP_BACKEND_URL || "http://localhost:5000";

export const StudySessionsList = ({ user, setUser }) => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    try {
      const { data } = await axios.get(`${BACKEND_URL}/api/study-sessions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSessions(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error("Failed to load study sessions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleDeleteSession = async (e, sessionId) => {
    e.stopPropagation();
    if (!confirm("Permanently delete this study session and all indexed document vectors?")) return;

    const token = localStorage.getItem("token");
    try {
      await axios.delete(`${BACKEND_URL}/api/study-sessions/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Study session deleted.");
      fetchSessions();
    } catch (err) {
      toast.error("Failed to delete session.");
    }
  };

  const filteredSessions = sessions.filter(s => 
    s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderStatusBadge = (status) => {
    switch (status) {
      case "ready":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" /> Ready
          </span>
        );
      case "processing":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/20 animate-pulse">
            <Clock className="w-3.5 h-3.5" /> Processing
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 border border-rose-500/20">
            <AlertCircle className="w-3.5 h-3.5" /> Ingestion Error
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-secondary text-muted-foreground border">
            Draft
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar user={user} setUser={setUser} />

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-10 space-y-8">
        {/* Banner Section */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900 via-primary/90 to-purple-900 p-8 md:p-12 text-white shadow-xl">
          <div className="relative z-10 max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              Session-Isolated RAG Engine
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
              AI Test Preparation & Study Rooms
            </h1>
            <p className="text-white/80 text-base md:text-lg leading-relaxed">
              Create dedicated study sessions for upcoming tests. Upload relevant PDFs to generate an isolated, grounded knowledge base—no generic LLM hallucinations.
            </p>
            <div className="pt-2 flex flex-wrap gap-4">
              <Button 
                onClick={() => setIsModalOpen(true)} 
                size="lg" 
                className="rounded-xl bg-white text-indigo-900 hover:bg-white/90 font-bold shadow-lg gap-2"
              >
                <Plus className="w-5 h-5 text-indigo-600" />
                Create Study Session
              </Button>
            </div>
          </div>

          <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 opacity-20 pointer-events-none">
            <BookOpen className="w-96 h-96" />
          </div>
        </section>

        {/* Controls Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Your Active Study Sessions</h2>
            <p className="text-sm text-muted-foreground">Select a session to launch the AI Study Room.</p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search sessions or subject..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 rounded-xl h-10"
              />
            </div>
            <Button onClick={() => setIsModalOpen(true)} className="rounded-xl font-medium gap-2">
              <Plus className="w-4 h-4" /> New Session
            </Button>
          </div>
        </div>

        {/* Sessions Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground font-medium">Fetching AI study sessions...</p>
            </div>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-border/60 rounded-3xl bg-card p-12 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
              <Sparkles className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold">No Study Sessions Found</h3>
            <p className="text-muted-foreground max-w-md mx-auto text-sm">
              {searchQuery ? "No study sessions match your search query." : "You haven't created any test preparation sessions yet. Get started by creating your first session!"}
            </p>
            <Button onClick={() => setIsModalOpen(true)} className="rounded-xl gap-2">
              <Plus className="w-4 h-4" /> Create First Session
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSessions.map((session) => (
              <div
                key={session._id}
                onClick={() => navigate(`/ai-study/${session._id}`)}
                className="group relative bg-card border border-border/60 hover:border-primary/50 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-secondary text-secondary-foreground">
                      {session.subject}
                    </span>
                    {renderStatusBadge(session.status)}
                  </div>

                  <h3 className="font-bold text-xl group-hover:text-primary transition-colors line-clamp-1 mb-2">
                    {session.title}
                  </h3>

                  {session.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4 leading-relaxed">
                      {session.description}
                    </p>
                  )}
                </div>

                <div className="pt-4 border-t border-border/40 mt-4 space-y-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5 font-medium">
                      <FileText className="w-3.5 h-3.5 text-primary" />
                      {session.documentCount || 0} PDFs Indexed
                    </span>
                    {session.examDate && (
                      <span className="flex items-center gap-1.5 font-medium text-indigo-600 dark:text-indigo-400">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(session.examDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-primary font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      Enter Study Room <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                    <button
                      onClick={(e) => handleDeleteSession(e, session._id)}
                      className="text-muted-foreground/60 hover:text-destructive p-1 rounded-lg hover:bg-destructive/10 transition-colors"
                      title="Delete Session"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <CreateSessionModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSessionCreated={() => fetchSessions()}
      />
    </div>
  );
};
