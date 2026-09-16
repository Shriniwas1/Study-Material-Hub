import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { Navbar } from "../components/Navbar";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { 
  Sparkles, 
  ArrowLeft, 
  FileText, 
  Upload, 
  Send, 
  Loader2, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  HelpCircle, 
  BookOpenCheck, 
  ListChecks, 
  BrainCircuit, 
  ExternalLink,
  Trash2,
  FileUp,
  Award
} from "lucide-react";
import { toast } from "sonner";

const BACKEND_URL = import.meta.env.VITE_APP_BACKEND_URL || "http://localhost:5000";

export const AIStudyRoom = ({ user, setUser }) => {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loadingSession, setLoadingSession] = useState(true);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [question, setQuestion] = useState("");
  const [sendingChat, setSendingChat] = useState(false);
  const [activeMode, setActiveMode] = useState("ASK");
  const [selectedPdfUrl, setSelectedPdfUrl] = useState(null);

  // Quiz Modal state
  const [quizModalOpen, setQuizModalOpen] = useState(false);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [currentQuiz, setCurrentQuiz] = useState(null);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [quizResult, setQuizResult] = useState(null);

  const chatBottomRef = useRef(null);

  // 1. Fetch Session and Status
  const fetchStatus = useCallback(async () => {
    const token = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}` };

    try {
      const [sessRes, statusRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/study-sessions/${sessionId}`, { headers }),
        axios.get(`${BACKEND_URL}/api/study-sessions/${sessionId}/status`, { headers })
      ]);

      setSession(sessRes.data);
      setDocuments(statusRes.data.documents || []);
    } catch (err) {
      toast.error("Failed to load study room context.");
      navigate("/ai-study");
    } finally {
      setLoadingSession(false);
    }
  }, [sessionId, navigate]);

  // 2. Fetch Chat History
  const fetchChatHistory = useCallback(async () => {
    const token = localStorage.getItem("token");
    try {
      const { data } = await axios.get(`${BACKEND_URL}/api/study-sessions/${sessionId}/chats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load chat history", err);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchStatus();
    fetchChatHistory();
  }, [fetchStatus, fetchChatHistory]);

  // Polling status every 3 seconds if any document is processing
  useEffect(() => {
    const hasProcessing = documents.some(d => d.status === "PROCESSING" || d.status === "UPLOADED");
    if (!hasProcessing) return;

    const interval = setInterval(() => {
      fetchStatus();
    }, 3000);

    return () => clearInterval(interval);
  }, [documents, fetchStatus]);

  // Scroll to bottom on new messages
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle PDF Upload (202 Accepted Async Ingestion)
  const handlePdfUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return toast.error("Please upload a valid PDF document.");
    }

    setUploadingPdf(true);
    const token = localStorage.getItem("token");
    const formData = new FormData();
    formData.append("file", file);

    try {
      await axios.post(
        `${BACKEND_URL}/api/study-sessions/${sessionId}/documents`,
        formData,
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" } }
      );

      toast.success("PDF uploaded! Background extraction and vector indexing started.");
      fetchStatus();
    } catch (err) {
      const msg = err.response?.data?.error || "Upload failed.";
      toast.error(typeof msg === "object" ? "Upload failed" : msg);
    } finally {
      setUploadingPdf(false);
      e.target.value = "";
    }
  };

  const handleDeleteDocument = async (documentId) => {
    if (!confirm("Remove this document and delete its vector index chunks?")) return;

    const token = localStorage.getItem("token");
    try {
      await axios.delete(`${BACKEND_URL}/api/study-sessions/${sessionId}/documents/${documentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Document removed.");
      fetchStatus();
    } catch (err) {
      toast.error("Failed to delete document.");
    }
  };

  // Handle RAG Chat Question Submit
  const handleSendQuestion = async (e) => {
    e.preventDefault();
    if (!question.trim() || sendingChat) return;

    const currentQuestion = question.trim();
    const currentMode = activeMode;
    setQuestion("");
    setSendingChat(true);

    // Optimistic UI insert
    const tempUserMsg = {
      _id: `temp_${Date.now()}`,
      role: "user",
      content: currentQuestion,
      mode: currentMode,
      createdAt: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMsg]);

    const token = localStorage.getItem("token");

    try {
      const { data } = await axios.post(
        `${BACKEND_URL}/api/study-sessions/${sessionId}/chat`,
        { question: currentQuestion, mode: currentMode },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const assistantMsg = {
        _id: data.messageId || `asst_${Date.now()}`,
        role: "assistant",
        content: data.answer,
        sources: data.sources || [],
        grounded: data.grounded,
        mode: data.mode,
        createdAt: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      const errorText = err.response?.data?.error || "Failed to process AI question.";
      toast.error(typeof errorText === "object" ? "AI processing error" : errorText);
    } finally {
      setSendingChat(false);
    }
  };

  // Handle Quiz Generation (Test Me Mode)
  const handleTriggerTestMe = async () => {
    setActiveMode("TEST_ME");
    setGeneratingQuiz(true);
    setQuizResult(null);
    setSelectedAnswers({});
    const token = localStorage.getItem("token");

    try {
      const { data } = await axios.post(
        `${BACKEND_URL}/api/study-sessions/${sessionId}/quiz`,
        { questionCount: 5 },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setCurrentQuiz(data);
      setQuizModalOpen(true);
    } catch (err) {
      const msg = err.response?.data?.error || "Failed to generate quiz from session material.";
      toast.error(typeof msg === "object" ? "Quiz generation failed" : msg);
    } finally {
      setGeneratingQuiz(false);
    }
  };

  const handleSelectQuizAnswer = (qIndex, optionIndex) => {
    setSelectedAnswers(prev => ({ ...prev, [qIndex]: optionIndex }));
  };

  const handleSubmitQuiz = async () => {
    if (!currentQuiz) return;
    const token = localStorage.getItem("token");

    const answersArray = currentQuiz.questions.map((_, idx) => 
      typeof selectedAnswers[idx] === "number" ? selectedAnswers[idx] : -1
    );

    try {
      const { data } = await axios.post(
        `${BACKEND_URL}/api/study-sessions/quizzes/${currentQuiz.quizId}/attempts`,
        { userAnswers: answersArray },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setQuizResult(data);
      toast.success(`Quiz Completed! Score: ${data.score}/${data.total} (${data.percentage}%)`);
    } catch (err) {
      toast.error("Failed to submit quiz attempt.");
    }
  };

  if (loadingSession) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm font-medium text-muted-foreground">Loading AI Study Room...</p>
        </div>
      </div>
    );
  }

  const readyDocs = documents.filter(d => d.status === "READY");

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col h-screen overflow-hidden">
      <Navbar user={user} setUser={setUser} />

      {/* Main Dual-Pane Layout */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* LEFT PANEL: Document Management & Session Context */}
        <aside className="w-full md:w-80 lg:w-96 border-r border-border/60 bg-card/40 flex flex-col h-1/2 md:h-full overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-border/60 space-y-2 bg-card/80">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/ai-study")}
              className="text-xs text-muted-foreground hover:text-foreground pl-0 h-auto"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Sessions
            </Button>
            
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary">
                {session?.subject}
              </span>
              <span className="text-xs text-muted-foreground">
                {readyDocs.length} PDFs Ready
              </span>
            </div>

            <h2 className="font-bold text-lg leading-tight line-clamp-1">{session?.title}</h2>
          </div>

          {/* Upload Dropzone */}
          <div className="p-4 border-b border-border/60 bg-muted/20">
            <div className="border-2 border-dashed border-border/80 hover:border-primary/60 rounded-xl p-3.5 text-center transition-colors bg-card">
              <input
                id="room-pdf-upload"
                type="file"
                accept=".pdf"
                onChange={handlePdfUpload}
                disabled={uploadingPdf}
                className="hidden"
              />
              <label htmlFor="room-pdf-upload" className="cursor-pointer group flex flex-col items-center">
                {uploadingPdf ? (
                  <Loader2 className="w-6 h-6 text-primary animate-spin mb-1" />
                ) : (
                  <FileUp className="w-6 h-6 text-primary group-hover:scale-110 transition-transform mb-1" />
                )}
                <span className="text-xs font-semibold">
                  {uploadingPdf ? "Uploading & Indexing..." : "Add PDF to Session"}
                </span>
                <span className="text-[10px] text-muted-foreground mt-0.5">Async extraction & vector search</span>
              </label>
            </div>
          </div>

          {/* Document List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Session Materials ({documents.length})
            </h3>

            {documents.length === 0 ? (
              <div className="text-center py-8 text-xs text-muted-foreground border rounded-xl p-4 bg-muted/10">
                <FileText className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
                No PDFs uploaded yet. Add PDFs to enable AI grounded answers.
              </div>
            ) : (
              documents.map((doc) => (
                <div
                  key={doc.id}
                  className="p-3 border border-border/50 rounded-xl bg-card hover:bg-accent/40 transition-colors flex items-start justify-between gap-2"
                >
                  <div className="space-y-1 overflow-hidden">
                    <div className="flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-primary shrink-0" />
                      <span 
                        onClick={() => setSelectedPdfUrl(doc.pdfUrl)}
                        className="font-medium text-xs truncate hover:underline cursor-pointer"
                        title={doc.fileName}
                      >
                        {doc.fileName}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      {doc.status === "READY" && (
                        <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                          <CheckCircle2 className="w-3 h-3" /> Ready ({doc.chunkCount || 0} chunks)
                        </span>
                      )}
                      {doc.status === "PROCESSING" && (
                        <span className="flex items-center gap-1 text-amber-600 font-semibold animate-pulse">
                          <Clock className="w-3 h-3" /> Processing...
                        </span>
                      )}
                      {doc.status === "FAILED" && (
                        <span className="flex items-center gap-1 text-rose-600 font-semibold">
                          <AlertCircle className="w-3 h-3" /> Ingestion Error
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setSelectedPdfUrl(doc.pdfUrl)}
                      className="p-1 text-muted-foreground hover:text-primary rounded"
                      title="View PDF"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteDocument(doc.id)}
                      className="p-1 text-muted-foreground hover:text-destructive rounded"
                      title="Remove PDF"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* RIGHT PANEL: AI Study Assistant & RAG Chat Studio */}
        <main className="flex-1 flex flex-col h-1/2 md:h-full bg-background overflow-hidden">
          {/* Top Mode Selection Toolbar */}
          <div className="p-3 border-b border-border/60 bg-card/60 flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-muted-foreground mr-1 hidden sm:inline">AI Mode:</span>
              <Button
                variant={activeMode === "ASK" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveMode("ASK")}
                className="h-8 rounded-lg text-xs gap-1.5"
              >
                <HelpCircle className="w-3.5 h-3.5" /> Ask
              </Button>

              <Button
                variant={activeMode === "EXPLAIN" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveMode("EXPLAIN")}
                className="h-8 rounded-lg text-xs gap-1.5"
              >
                <BookOpenCheck className="w-3.5 h-3.5" /> Explain
              </Button>

              <Button
                variant={activeMode === "SUMMARIZE" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveMode("SUMMARIZE")}
                className="h-8 rounded-lg text-xs gap-1.5"
              >
                <ListChecks className="w-3.5 h-3.5" /> Summarize
              </Button>

              <Button
                variant={activeMode === "TEST_ME" ? "default" : "outline"}
                size="sm"
                onClick={handleTriggerTestMe}
                disabled={generatingQuiz || readyDocs.length === 0}
                className="h-8 rounded-lg text-xs gap-1.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white border-0 hover:from-amber-600 hover:to-orange-700"
              >
                {generatingQuiz ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BrainCircuit className="w-3.5 h-3.5" />}
                Test Me
              </Button>
            </div>

            <div className="text-[11px] text-muted-foreground font-medium flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Grounded to Session PDFs
            </div>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-muted-foreground space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-lg text-foreground">AI Study Room Active</h4>
                <p className="text-sm max-w-md">
                  Ask any question about your uploaded documents for <b>{session?.subject}</b>. The system will retrieve relevant chunks and generate grounded answers with citations.
                </p>
                <div className="flex flex-wrap justify-center gap-2 pt-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setQuestion("Explain the key concepts in these documents.");
                      setActiveMode("EXPLAIN");
                    }}
                    className="rounded-full text-xs"
                  >
                    💡 "Explain key concepts"
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setQuestion("Summarize the main points for my upcoming test.");
                      setActiveMode("SUMMARIZE");
                    }}
                    className="rounded-full text-xs"
                  >
                    📝 "Summarize main points"
                  </Button>
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg._id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] md:max-w-[75%] rounded-2xl p-4 shadow-sm space-y-3 ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-tr-none"
                        : "bg-card border border-border/60 rounded-tl-none text-foreground"
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between gap-4 text-[10px] opacity-80 border-b border-current/10 pb-1.5">
                      <span className="font-bold uppercase tracking-wider">
                        {msg.role === "user" ? "You" : "AI Tutor"}
                      </span>
                      {msg.mode && (
                        <span className="px-1.5 py-0.5 rounded bg-black/10 font-semibold">
                          Mode: {msg.mode}
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="text-sm leading-relaxed whitespace-pre-wrap font-sans">
                      {msg.content}
                    </div>

                    {/* Citations / Sources */}
                    {msg.role === "assistant" && msg.sources && msg.sources.length > 0 && (
                      <div className="pt-2 border-t border-border/40 space-y-1.5">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                          📚 Sources & Citations:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.sources.map((src, idx) => (
                            <span
                              key={idx}
                              onClick={() => {
                                const doc = documents.find(d => d.id === src.documentId || d.fileName === src.fileName);
                                if (doc?.pdfUrl) setSelectedPdfUrl(doc.pdfUrl);
                              }}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-md bg-secondary text-secondary-foreground hover:bg-primary/20 cursor-pointer border border-border/60 transition-colors"
                              title="Click to view document"
                            >
                              <FileText className="w-3 h-3 text-primary" />
                              {src.fileName} — Page {src.pageNumber}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}

            {sendingChat && (
              <div className="flex justify-start">
                <div className="bg-card border rounded-2xl rounded-tl-none p-4 shadow-sm flex items-center gap-3">
                  <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  <span className="text-xs text-muted-foreground font-medium">
                    Searching session vector database & generating answer...
                  </span>
                </div>
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>

          {/* Bottom Chat Input Form */}
          <form onSubmit={handleSendQuestion} className="p-4 border-t border-border/60 bg-card/80 flex gap-2">
            <Input
              placeholder={`Ask a question in ${activeMode} mode...`}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              disabled={sendingChat || readyDocs.length === 0}
              className="rounded-xl h-12 flex-1 text-sm"
            />
            <Button
              type="submit"
              disabled={sendingChat || !question.trim() || readyDocs.length === 0}
              className="h-12 px-5 rounded-xl bg-gradient-to-r from-indigo-600 to-primary font-semibold gap-2"
            >
              {sendingChat ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </form>
        </main>
      </div>

      {/* PDF Direct Viewer Modal */}
      {selectedPdfUrl && (
        <Dialog open={!!selectedPdfUrl} onOpenChange={() => setSelectedPdfUrl(null)}>
          <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-4 rounded-2xl">
            <DialogHeader className="flex items-center justify-between pb-2 border-b">
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" /> PDF Reader Preview
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 w-full bg-muted rounded-xl overflow-hidden mt-2">
              <iframe
                src={`https://docs.google.com/viewer?url=${encodeURIComponent(selectedPdfUrl)}&embedded=true`}
                className="w-full h-full border-none"
                title="PDF Document Preview"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Interactive MCQ Quiz Modal */}
      {quizModalOpen && currentQuiz && (
        <Dialog open={quizModalOpen} onOpenChange={setQuizModalOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-6 rounded-2xl">
            <DialogHeader className="mb-4">
              <div className="flex items-center gap-2">
                <Award className="w-6 h-6 text-amber-500" />
                <DialogTitle className="text-xl font-bold">{currentQuiz.title}</DialogTitle>
              </div>
            </DialogHeader>

            {quizResult ? (
              <div className="space-y-6">
                <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-900 to-purple-900 text-white text-center space-y-2 shadow-lg">
                  <h3 className="text-2xl font-black">Quiz Completed!</h3>
                  <p className="text-3xl font-bold text-amber-300">
                    {quizResult.score} / {quizResult.total} ({quizResult.percentage}%)
                  </p>
                </div>

                <div className="space-y-4">
                  {quizResult.results.map((res, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-xl border ${
                        res.isCorrect ? "bg-emerald-500/10 border-emerald-500/30" : "bg-rose-500/10 border-rose-500/30"
                      }`}
                    >
                      <p className="font-bold text-sm mb-2">Q{idx + 1}. {res.question}</p>
                      <p className="text-xs font-semibold mb-1">
                        Your Answer: {res.selectedOptionIndex >= 0 ? `Option ${res.selectedOptionIndex + 1}` : "Not Answered"}
                      </p>
                      <p className="text-xs text-muted-foreground font-sans">{res.explanation}</p>
                    </div>
                  ))}
                </div>

                <Button onClick={() => setQuizModalOpen(false)} className="w-full rounded-xl">
                  Close Quiz Results
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {currentQuiz.questions.map((q, qIdx) => (
                  <div key={q.id} className="p-4 border rounded-xl bg-card space-y-3">
                    <p className="font-bold text-sm">Q{qIdx + 1}. {q.question}</p>
                    <div className="space-y-2">
                      {q.options.map((opt, optIdx) => (
                        <div
                          key={optIdx}
                          onClick={() => handleSelectQuizAnswer(qIdx, optIdx)}
                          className={`p-3 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                            selectedAnswers[qIdx] === optIdx
                              ? "bg-primary/10 border-primary text-primary font-bold"
                              : "hover:bg-accent"
                          }`}
                        >
                          {String.fromCharCode(65 + optIdx)}. {opt}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                <Button onClick={handleSubmitQuiz} className="w-full h-11 rounded-xl font-bold">
                  Submit Quiz Attempt
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
