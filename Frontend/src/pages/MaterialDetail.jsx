import { useState, useEffect, useCallback } from "react"
import { useParams, useNavigate } from "react-router-dom"
import axios from "axios"
import { Button } from "../components/ui/button"
import { BookOpen, ArrowLeft, Star, Trash2, ExternalLink } from "lucide-react"
import { toast } from "sonner"

// Fallback to local port if environment variable is missing
const BACKEND_URL = import.meta.env.VITE_APP_BACKEND_URL || "http://localhost:5000";

export const MaterialDetail = ({ user }) => {
  const { id } = useParams()
  const navigate = useNavigate()
  
  const [material, setMaterial] = useState(null)
  const [userRating, setUserRating] = useState(null)
  const [loading, setLoading] = useState(true)
  const [hoveredStar, setHoveredStar] = useState(0)

  const fetchMaterialData = useCallback(async () => {
    const token = localStorage.getItem("token")
    const headers = { Authorization: `Bearer ${token}` }

    try {
      const [matRes, rateRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/materials/${id}`),
        // Catch 404s for new users who haven't rated the item yet
        axios.get(`${BACKEND_URL}/api/materials/${id}/user-rating`, { headers })
          .catch(() => ({ data: { rating: null } }))
      ])
      
      setMaterial(matRes.data)
      setUserRating(rateRes.data.rating)
    } catch (err) {
      toast.error("Failed to load content")
      navigate("/dashboard")
    } finally {
      setLoading(false)
    }
  }, [id, navigate])

  useEffect(() => {
    fetchMaterialData()
  }, [fetchMaterialData])

  const handleRate = async (rating) => {
    try {
      const token = localStorage.getItem("token")
      await axios.post(
        `${BACKEND_URL}/api/materials/${id}/rate`,
        { rating },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setUserRating(rating)
      toast.success("Rating submitted!")
      fetchMaterialData()
    } catch (err) {
      toast.error("Couldn't save rating")
    }
  }

  const handleDelete = async () => {
    if (!confirm("Delete this material permanently?")) return

    try {
      const token = localStorage.getItem("token")
      await axios.delete(`${BACKEND_URL}/api/materials/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      toast.success("Deleted successfully")
      navigate("/dashboard")
    } catch (err) {
      toast.error(err.response?.data?.error || "Delete failed")
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="animate-pulse text-muted-foreground font-medium">Fetching document...</p>
    </div>
  )

  if (!material) return null

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation Bar */}
      <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/dashboard")}>
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold">Study Hub</h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Check against both id and _id for uploader ownership */}
            {(material.uploader_id === user?.id || material.uploader_id === user?._id) && (
              <Button variant="destructive" onClick={handleDelete} className="rounded-xl">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            )}
            <Button variant="outline" onClick={() => navigate("/dashboard")} className="rounded-xl">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Document Header Info */}
            <section className="bg-card border border-border/50 rounded-xl p-8 shadow-sm">
              <h2 className="text-3xl font-bold mb-4">{material.title}</h2>
              <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
                <span className="bg-secondary px-3 py-1 rounded-lg font-medium">{material.subject}</span>
                <span>Uploaded by {material.uploader_name || "Anonymous"}</span>
              </div>
              {material.description && (
                <p className="text-muted-foreground mb-6 leading-relaxed">{material.description}</p>
              )}

              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                {/* Fixed safe rendering for rating to prevent crash */}
                <span className="text-lg font-bold">
                  {(material.average_rating || 0).toFixed(1)}
                </span>
                <span className="text-sm text-muted-foreground">
                  ({material.ratings_count || 0} ratings)
                </span>
              </div>
            </section>

            {/* PDF Viewer Section */}
            <section className="bg-card border border-border/50 rounded-xl p-8 shadow-sm">
              <header className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold">Study Material Reader</h3>
                <a 
                  href={`${BACKEND_URL}/api/materials/${id}/pdf?token=${localStorage.getItem('token')}`}
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-sm text-primary hover:underline flex items-center gap-1 font-medium"
                >
                  <ExternalLink className="w-3 h-3" /> Open in New Tab
                </a>
              </header>
              <div className="w-full h-[800px] bg-muted rounded-lg overflow-hidden border border-border/50">
                {id ? (
                  <object
                    data={`${BACKEND_URL}/api/materials/${id}/pdf?token=${localStorage.getItem('token')}`}
                    type="application/pdf"
                    className="w-full h-full"
                  >
                    <iframe
                      src={`${BACKEND_URL}/api/materials/${id}/pdf?token=${localStorage.getItem('token')}`}
                      className="w-full h-full"
                      style={{ border: "none" }}
                      title="PDF Reader"
                    />
                  </object>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground font-medium">Document link is unavailable.</p>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Rating Sidebar */}
          <aside className="lg:col-span-1">
            <div className="bg-card border border-border/50 rounded-xl p-8 shadow-sm sticky top-24">
              <h3 className="text-xl font-semibold mb-4">Rate this Material</h3>
              <p className="text-sm text-muted-foreground mb-6">
                {userRating ? "You've already rated this:" : "Help others by providing your feedback:"}
              </p>
              
              <div className="flex gap-2 mb-6">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => handleRate(star)}
                    onMouseEnter={() => setHoveredStar(star)}
                    onMouseLeave={() => setHoveredStar(0)}
                    className="transition-transform hover:scale-125 focus:outline-none"
                  >
                    <Star
                      className={`w-8 h-8 ${
                        star <= (hoveredStar || userRating || 0)
                          ? "fill-yellow-400 text-yellow-400 drop-shadow-sm"
                          : "text-muted-foreground/30"
                      }`}
                    />
                  </button>
                ))}
              </div>
              
              {userRating && (
                <div className="mt-4 p-3 bg-primary/5 rounded-lg border border-primary/10">
                    <p className="text-sm text-primary font-semibold text-center">
                        You rated this {userRating} stars
                    </p>
                </div>
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}