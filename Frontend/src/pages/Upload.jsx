import { useState } from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"
import { Button } from "../components/ui/button"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"
import { Textarea } from "../components/ui/textarea"
import { BookOpen, Upload as UploadIcon, ArrowLeft, FileUp } from "lucide-react"
import { toast } from "sonner"

// Ensure BACKEND_URL points to your server (e.g., http://localhost:5000)
const BACKEND_URL = import.meta.env.VITE_APP_BACKEND_URL || "http://localhost:5000";

export const Upload = ({ user }) => {
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [formData, setFormData] = useState({
    title: "",
    subject: "",
    description: ""
  })
  
  const navigate = useNavigate()

  const handleInputChange = (e) => {
    const { id, value } = e.target
    setFormData(prev => ({ ...prev, [id]: value }))
  }

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    // Basic validation to ensure only PDFs are selected
    if (selectedFile?.type === "application/pdf") {
      setFile(selectedFile)
    } else {
      toast.error("Please select a valid PDF file")
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) return toast.error("Please select a PDF file")

    setUploading(true)
    const token = localStorage.getItem("token")

    try {
      // 1. Get secure signature from backend
      const { data: sig } = await axios.post(
        `${BACKEND_URL}/api/cloudinary/generate-signature`,
        {}, 
        { headers: { Authorization: `Bearer ${token}` } }
      )

      // 2. Prepare Cloudinary Upload Data
      const uploadData = new FormData()
      uploadData.append("file", file)
      uploadData.append("api_key", sig.api_key)
      uploadData.append("timestamp", sig.timestamp)
      uploadData.append("signature", sig.signature)
      uploadData.append("folder", "study-materials")
      
      /**
       * CRITICAL FIX: Force delivery type to 'upload' (public).
       * This ensures the file is accessible by the browser viewer without 401 errors.
       */
      uploadData.append("type", "upload") 

      // 3. Upload directly to Cloudinary
      // We use 'auto' so Cloudinary detects it's a PDF and handles headers correctly
      const { data: cloudRes } = await axios.post(
        `https://api.cloudinary.com/v1_1/${sig.cloud_name}/auto/upload`,
        uploadData
      )

      // 4. Save metadata to our MongoDB database
      await axios.post(
        `${BACKEND_URL}/api/materials`,
        {
          ...formData,
          pdf_url: cloudRes.secure_url,
          cloudinary_public_id: cloudRes.public_id,
          uploader_id: user?.id || user?._id, // Support both 'id' and '_id' formats
          uploader_name: user?.name || "Anonymous"
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      toast.success("Material shared successfully!")
      navigate("/dashboard")
    } catch (err) {
      // Clean error handling to prevent React from crashing on object children
      const errorMessage = err.response?.data?.error || err.response?.data?.message || "Upload failed";
      toast.error(typeof errorMessage === 'object' ? "An unexpected server error occurred" : errorMessage);
      console.error("Upload Error Details:", err.response?.data);
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation Header */}
      <nav className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/dashboard")}>
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold">Study Hub</span>
          </div>
          <Button variant="outline" onClick={() => navigate("/dashboard")} className="rounded-xl">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
          </Button>
      </nav>

      {/* Main Form Content */}
      <main className="max-w-xl mx-auto py-12 px-6">
        <header className="mb-8">
          <h2 className="text-3xl font-bold">Upload Study Material</h2>
          <p className="text-muted-foreground mt-2">Share PDF resources with your classmates.</p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-2">
            <Label htmlFor="title">Document Title *</Label>
            <Input 
              id="title" 
              placeholder="e.g., Advanced Mathematics Notes"
              value={formData.title} 
              onChange={handleInputChange} 
              required 
              className="h-12 rounded-xl"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="subject">Subject *</Label>
            <Input 
              id="subject" 
              placeholder="e.g., Calculus II"
              value={formData.subject} 
              onChange={handleInputChange} 
              required 
              className="h-12 rounded-xl"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea 
              id="description" 
              placeholder="Briefly describe what is inside this document..."
              value={formData.description} 
              onChange={handleInputChange} 
              className="rounded-xl min-h-[100px]"
            />
          </div>

          <div className="grid gap-2">
            <Label>Select PDF File *</Label>
            <div className="grid gap-2 text-center border-2 border-dashed border-muted rounded-xl p-8 bg-card hover:bg-accent/50 transition-colors">
                <input 
                  id="file" 
                  type="file" 
                  accept=".pdf" 
                  onChange={handleFileChange} 
                  className="hidden" 
                />
                <label htmlFor="file" className="cursor-pointer group">
                  <FileUp className="w-12 h-12 mx-auto mb-2 text-primary group-hover:scale-110 transition-transform" />
                  <p className="text-sm font-medium">
                    {file ? file.name : "Click to select or drag and drop your PDF"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Maximum file size: 10MB</p>
                </label>
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full h-12 rounded-xl text-base font-semibold" 
            disabled={uploading}
          >
            {uploading ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin text-lg">⏳</span> Uploading to Cloudinary...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <UploadIcon className="w-4 h-4" /> Share Material
              </span>
            )}
          </Button>
        </form>
      </main>
    </div>
  )
}