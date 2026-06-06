# Chess Academy Management System

A full-stack management system for chess academies built with Django (backend) and React/Vite (frontend).

## Features
- Student & trainer management
- Batch/camp enrollment and attendance tracking
- Automated fee calculation (beginner/intermediate/advanced/residential/individual/home-tutoring)
- Payment recording with UPI/cash/bank transfer support
- WhatsApp reminders via Twilio
- Trainer payroll management
- Monthly profit & loss reports
- ELO-based rate tiers for special session types
- JWT authentication with role-based access (admin / trainer)

## Quick Start

### Backend
```bash
cd /home/user/Payments_manager
source venv/bin/activate
cd backend
cp .env.example .env   # Edit .env with your settings
python manage.py runserver
```

Default superuser: `admin` / `admin123`

### Frontend
```bash
cd /home/user/Payments_manager/frontend
npm run dev
```

Open http://localhost:5173

### API
Backend runs at http://localhost:8000/api/
Admin panel at http://localhost:8000/admin/

## Project Structure
```
Payments_manager/
├── backend/          # Django project
│   ├── academy/      # Project settings and URLs
│   ├── core/         # Main app (models, views, serializers)
│   ├── requirements.txt
│   └── .env.example
└── frontend/         # React + Vite
    └── src/
        ├── pages/    # All page components
        ├── components/ # Reusable components
        ├── api/      # Axios API client
        └── context/  # Auth context
```

## Environment Variables
See `backend/.env.example` for required variables:
- `SECRET_KEY` – Django secret key
- `DEBUG` – True/False
- `TWILIO_ACCOUNT_SID` – Twilio credentials for WhatsApp
- `TWILIO_AUTH_TOKEN`
- `TWILIO_WHATSAPP_FROM` – Twilio WhatsApp sender number

## Production Notes
- Switch database to PostgreSQL (see commented config in settings.py)
- Set `DEBUG=False` and configure `ALLOWED_HOSTS`
- Run `python manage.py collectstatic`
- Use gunicorn + nginx for deployment
