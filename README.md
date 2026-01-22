# Study Material Hub 

A full-stack MERN application designed for students to upload, organize, and review academic study materials. 

## Features
- **Authentication:** Secure user registration and login using JWT.
- **Material Management:** Upload and manage PDFs/Documents with Cloudinary integration.
- **Ratings & Reviews:** Users can rate materials and leave feedback.
- **Responsive Dashboard:** A modern UI built with React and Vite.

---

## Tech Stack

### Backend
- **Node.js & Express:** Server-side framework.
- **MongoDB:** Database for storing users, materials, and reviews.
- **Cloudinary:** Image/File hosting.
- **JWT:** Secure authentication.

### Frontend
- **React (Vite):** Fast, modern frontend library.
- **Tailwind CSS:** For styling.
- **Hooks:** Custom hooks for state management (e.g., `use-toast`).

## Setup Instructions
### 1. Clone the Repository
```Bash
git clone [https://github.com/your-username/study-material-hub.git](https://github.com/your-username/study-material-hub.git)
cd study-material-hub
```
### 2. Backend Setup
- **Navigate to the backend folder:

```Bash
cd Backend
```
### Install dependencies:

```Bash
npm install
```
### Create a .env file and add your credentials:

```Bash
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
CLOUDINARY_CLOUD_NAME=your_name
CLOUDINARY_API_KEY=your_key
CLOUDINARY_API_SECRET=your_secret
```

### Start the server:

```Bash
npm start 
```
### 3. Frontend Setup
Navigate to the frontend folder:

```Bash
cd ../Frontend
```
Install dependencies:

```Bash
npm install
```
Start the development server:

```Bash
npm run dev
```
