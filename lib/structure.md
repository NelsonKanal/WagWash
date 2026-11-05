wag-and-wash/
│
├── frontend/                  # React + Vite website
│   ├── public/
│   ├── src/
│   │   ├── assets/ 
│   │   ├── components/
│   │   ├── pages/
│   │   ├── context/
│   │   ├── hooks/
│   │   ├── lib/
│   │   │   └── supabase.js
│   │   ├── services/
│   │   ├── styles/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── .env.example
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── backend/                   # Node.js + Express API
│   ├── src/
│   │   ├── config/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── services/
│   │   └── utils/
│   ├── database/
│   │   └── supabase-migration.sql
│   ├── index.cjs
│   ├── package.json
│   └── .env.example
│
├── docs/
│   ├── setup.md
│   ├── deployment.md
│   └── payments.md
│
├── .gitignore
├── README.md
└── LICENSE