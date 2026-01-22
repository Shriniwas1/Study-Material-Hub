// src/controllers/review.controller.js
export const addReview = async (req, res) => {
    try {
        res.status(200).json({ message: "Review logic goes here" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};