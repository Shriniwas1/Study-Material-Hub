import { useNavigate, useLocation } from "react-router-dom";
import { BookOpen, Sparkles, LogOut, FileText, PlusCircle } from "lucide-react";
import { Button } from "./ui/button";

export const Navbar = ({ user, setUser }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.clear();
    if (setUser) setUser(null);
    navigate("/login");
  };

  const isAIActive = location.pathname.startsWith("/ai-study");

  return (
    <nav className="sticky top-0 z-50 border-b border-border/60 bg-background/90 backdrop-blur-md px-6 py-3.5 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <div 
          className="flex items-center gap-3 cursor-pointer group" 
          onClick={() => navigate("/dashboard")}
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-indigo-600 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
            <BookOpen className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Study Hub
            </span>
            <span className="hidden sm:inline-block ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              v2.0 AI
            </span>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-1 bg-muted/50 p-1 rounded-xl border border-border/40">
          <Button
            variant={!isAIActive ? "secondary" : "ghost"}
            size="sm"
            onClick={() => navigate("/dashboard")}
            className="rounded-lg text-sm font-medium gap-2"
          >
            <FileText className="w-4 h-4" />
            Global Materials
          </Button>
          <Button
            variant={isAIActive ? "default" : "ghost"}
            size="sm"
            onClick={() => navigate("/ai-study")}
            className={`rounded-lg text-sm font-medium gap-2 ${
              isAIActive ? "bg-gradient-to-r from-indigo-600 to-primary text-white shadow-sm" : "hover:text-primary"
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-300 fill-amber-300 animate-pulse" />
            AI Test Prep
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground hidden lg:inline-block bg-accent px-3 py-1.5 rounded-lg border font-medium">
          👤 {user?.name || "Student"}
        </span>

        <Button 
          onClick={() => navigate("/upload")} 
          size="sm"
          variant="outline"
          className="rounded-xl border-dashed hover:border-primary hidden sm:flex gap-1.5"
        >
          <PlusCircle className="w-4 h-4 text-primary" />
          Share Material
        </Button>

        <Button 
          variant="ghost" 
          onClick={handleLogout} 
          size="sm" 
          className="rounded-xl text-muted-foreground hover:text-destructive"
        >
          <LogOut className="w-4 h-4 mr-1.5" />
          Logout
        </Button>
      </div>
    </nav>
  );
};
