# 🎤 Automated Table Creation and Querying Using Voice-Based Text-to-SQL

## 📌 Project Overview

Automated Table Creation and Querying Using Voice-Based Text-to-SQL is a web-based application that enables users to interact with a PostgreSQL database using natural language voice or text commands. The system automatically converts user input into SQL queries and executes them on a Supabase-hosted PostgreSQL database.

The application combines Speech Recognition, Natural Language Processing (NLP), SQL Query Generation, and Real-Time Database Execution to provide a user-friendly database management experience without requiring prior knowledge of SQL.

---

## 🚀 Key Features

- 🎙️ Voice-to-Text Command Processing
- 📝 Text-Based Command Execution
- 🧠 Rule-Based Natural Language Processing
- ⚡ Automatic SQL Query Generation
- 🗂️ Dynamic Table Creation
- ➕ Record Insertion
- 🔍 Record Retrieval
- ✏️ Record Updates
- ❌ Record Deletion
- 📋 Table Structure Description
- 📊 Display Available Database Tables
- 📜 Query History Tracking
- 🔄 Real-Time Database Operations
- 🌙 Dark and Light Theme Support
- 🛡️ Input Validation and Safe Query Execution

---

## 🏗️ System Architecture

```text
Voice/Text Input
        ↓
Speech Recognition (Web Speech API)
        ↓
Natural Language Processing
        ↓
SQL Query Generation
        ↓
Supabase Edge Functions
        ↓
PostgreSQL Database
        ↓
Result Display & Query History
```

---

## 🛠️ Technologies Used

### Frontend
- React.js
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui

### Backend
- Supabase Edge Functions
- PostgreSQL

### APIs & Libraries
- Web Speech API
- Supabase JavaScript SDK

### Development Tools
- Git
- GitHub
- VS Code

---

## 📂 Project Structure

```text
Automated-Table-Creation-and-Querying-Using-Voice-Based-Text-to-SQL
│
├── public/
│
├── src/
│   ├── components/
│   │   ├── CommandInput.tsx
│   │   ├── QueryResultDisplay.tsx
│   │   ├── QueryHistoryPanel.tsx
│   │   ├── ThemeToggle.tsx
│   │   └── ConfirmDialog.tsx
│   │
│   ├── hooks/
│   │   └── use-speech-recognition.ts
│   │
│   ├── lib/
│   │   ├── nlp-processor.ts
│   │   └── query-engine.ts
│   │
│   ├── pages/
│   │   └── Index.tsx
│   │
│   └── main.tsx
│
├── supabase/
│   └── functions/
│       └── execute-query/
│           └── index.ts
│
├── index.html
├── .env
├── package.json
├── package-lock.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── README.md
└── .gitignore
```

---

## ⚙️ Installation and Setup

### Clone the Repository

```bash
git clone https://github.com/Arun-kumar-8/Automated-Table-Creation-and-Querying-Using-Voice-Based-Text-to-SQL.git
```

```bash
cd Automated-Table-Creation-and-Querying-Using-Voice-Based-Text-to-SQL
```

### Install Dependencies

```bash
npm install
```

### Configure Environment Variables

Create a `.env` file and configure:

```env
VITE_SUPABASE_URL=YOUR_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_KEY
```

### Run the Application

```bash
npm run dev
```

The application will start on:

```text
http://localhost:5173
```

---

## 🎯 Sample Commands

### Create Table

```text
Create table students with name and marks
```

### Insert Record

```text
Insert name Arun and marks 95 into students
```

### Retrieve Records

```text
Show students
```

### Update Record

```text
Update students set marks to 100 where name is Arun
```

### Delete Record

```text
Delete from students where name is Arun
```

### Describe Table

```text
Describe students
```

### Show Available Tables

```text
Show all tables
```

---

## 📊 Project Outcomes

The system successfully demonstrates:

- Voice-Based Database Interaction
- Natural Language to SQL Conversion
- Automated Table Creation
- Dynamic Data Insertion
- Data Retrieval and Filtering
- Record Modification
- Record Deletion
- Query History Management
- Real-Time Database Communication

The generated SQL queries are executed directly on the Supabase PostgreSQL database, and results are displayed instantly through an interactive user interface.

---

## 🔒 Security Features

- Input Validation
- Table Name Verification
- Safe SQL Generation
- Confirmation Dialog for Update/Delete Operations
- Query Execution Logging
- Row Level Security (RLS) Support
- Error Handling and Validation Checks

---

## 📈 Future Enhancements

- AI-Powered NLP using Large Language Models (LLMs)
- Advanced Query Understanding
- Aggregate Functions (COUNT, SUM, AVG, MIN, MAX)
- GROUP BY and JOIN Operations
- Multi-Database Support
- Mobile Application Deployment
- Multi-Language Voice Recognition
- User Authentication and Role Management

---

## 👨‍💻 Author

**Arun Kumar**

B.Tech Industrial Oriented Mini Project

Computer Science and Engineering - Data Science

---

## 📄 License

This project is developed for academic and educational purposes.
