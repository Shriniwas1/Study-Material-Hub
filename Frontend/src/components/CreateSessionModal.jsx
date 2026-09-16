import { useState } from "react";
import axios from "axios";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Sparkles, FileUp, Loader2, Calendar } from "lucide-react";
import { toast } from "sonner";

const BACKEND_URL = import.meta.env.VITE_APP_BACKEND_URL || "http://localhost:5000";

export const CreateSessionModal = ({ open, onOpenChange, onSessionCreated }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    subject: "",
    description: "",
    examDate: ""
  });
  const [initialFile, setInitialFile] = useState(null);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.id]: e.target.value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && (file.type === "application/pdf" || file.name.endsWith(".pdf"))) {
      setInitialFile(file);
    } else {
      toast.error("Please select a valid PDF document.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const token = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}` };

    try {
      // 1. Create Study Session
      const { data: session } = await axios.post(
        `${BACKEND_URL}/api/study-sessions`,
        formData,
        { headers }
      );

      // 2. Upload initial PDF if provided
      if (initialFile) {
        const uploadData = new FormData();
        uploadData.append("file", initialFile);

        await axios.post(
          `${BACKEND_URL}/api/study-sessions/${session._id}/documents`,
          uploadData,
          { headers: { ...headers, "Content-Type": "multipart/form-data" } }
        );
        toast.success("Study session created! PDF processing started asynchronously.");
      } else {
        toast.success("Study session created!");
      }

      setFormData({ title: "", subject: "", description: "", examDate: "" });
      setInitialFile(null);
      onOpenChange(false);

      if (onSessionCreated) onSessionCreated(session);
    } catch (err) {
      const msg = err.response?.data?.error || err.message || "Failed to create study session";
      toast.error(typeof msg === "object" ? "Error creating session" : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg rounded-2xl p-6">
        <DialogHeader className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Sparkles className="w-4 h-4" />
            </div>
            <DialogTitle className="text-xl font-bold">New AI Study Session</DialogTitle>
          </div>
          <DialogDescription>
            Group course material by exam or subject. The AI assistant will retrieve answers strictly from this session's documents.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="title" className="text-xs font-semibold uppercase text-muted-foreground">Session Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Operating Systems Unit Test 2"
              value={formData.title}
              onChange={handleChange}
              required
              className="rounded-xl h-11"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="subject" className="text-xs font-semibold uppercase text-muted-foreground">Subject / Course *</Label>
              <Input
                id="subject"
                placeholder="e.g., CS-401 OS"
                value={formData.subject}
                onChange={handleChange}
                required
                className="rounded-xl h-11"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="examDate" className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Exam Date
              </Label>
              <Input
                id="examDate"
                type="date"
                value={formData.examDate}
                onChange={handleChange}
                className="rounded-xl h-11"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description" className="text-xs font-semibold uppercase text-muted-foreground">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Units covered: Deadlocks, Virtual Memory, Page Replacement algorithms..."
              value={formData.description}
              onChange={handleChange}
              className="rounded-xl min-h-[80px]"
            />
          </div>

          <div className="grid gap-2">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Initial Test PDF Document (Optional)</Label>
            <div className="border-2 border-dashed border-border/80 hover:border-primary/50 bg-muted/30 rounded-xl p-4 text-center transition-colors">
              <input
                id="initial-pdf"
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              <label htmlFor="initial-pdf" className="cursor-pointer group block">
                <FileUp className="w-8 h-8 mx-auto mb-1 text-muted-foreground group-hover:text-primary transition-colors" />
                <p className="text-sm font-medium text-foreground">
                  {initialFile ? initialFile.name : "Upload first PDF for this session"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">Maximum file size: 15MB</p>
              </label>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading} 
              className="rounded-xl bg-gradient-to-r from-indigo-600 to-primary font-semibold gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating Session...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Start AI Prep Session
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
