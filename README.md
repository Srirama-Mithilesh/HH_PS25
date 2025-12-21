# 🌆 Horizon Haven – Smart Travel & Property Discovery Platform

![Node.js](https://img.shields.io/badge/Node.js-18.x-green)
![Express](https://img.shields.io/badge/Express.js-Backend-lightgrey)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E)
![Redis](https://img.shields.io/badge/Redis-Caching-red)
![Docker](https://img.shields.io/badge/Docker-Containerized-blue)
![AI Assisted](https://img.shields.io/badge/AI-Assisted-orange)

Horizon Haven is a smart travel and property discovery platform focused on **performance, scalability, and structured backend design**.  
AI is used only as a **supporting feature** to generate missing city content and images when required.

---

## 📌 Problem Statement

Travel and property platforms often face:
- Incomplete city or destination data
- Manual effort to onboard new locations
- Repeated database queries causing performance issues
- Difficulty scaling content efficiently

---

## 🎯 Solution Overview

Horizon Haven addresses these problems by:
- Structuring city, hotel, and booking data efficiently
- Using Redis caching to reduce database load
- Automatically generating fallback city content when data is missing
- Ensuring scalability through containerized infrastructure

AI is **not a core dependency** and does not affect normal application flow.

---

## 🏗️ System Architecture

```text
┌──────────────┐
│   Frontend   │
│ (HTML/CSS/JS)│
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Backend    │
│ Node + Express│
└──────┬───────┘
       │
 ┌─────▼─────┐       ┌──────────────┐
 │   Redis   │◀─────▶│   Supabase   │
 │  (Cache)  │       │ PostgreSQL   │
 └───────────┘       └──────┬───────┘
                             │
                      ┌──────▼──────┐
                      │ AI Agent     │
                      │ (On-Demand)  │
                      └─────────────┘


## Role of AI Agent

The AI agent is triggered **only when city data is missing** and is used to:

- Generate city descriptions  
- Fetch relevant city or landmark images  
- Store generated content back into the database  

The agent:
- Runs asynchronously  
- Does not block user requests  
- Enhances data completeness only  

---

## Technology Stack

### Frontend
- HTML  
- CSS  
- JavaScript  

### Backend
- Node.js  
- Express.js  
- REST APIs  

### Database & Storage
- Supabase (PostgreSQL)  
- Supabase Storage  

### Performance & Infrastructure
- Redis (Caching)  
- Docker  
- Docker Compose  

### AI & External Services
- Gemini API (Text generation)  
- Pexels API (Primary image source)  
- Unsplash API (Fallback image source)  

---

## Request Flow

1. User requests a city or hotel page  
2. Backend checks Redis cache  
3. If cached → response returned immediately  
4. If not cached:  
   - Data fetched from Supabase  
   - AI agent triggered only if city data is missing  
5. Generated content stored in database  
6. Cache updated for future requests  

---

## How to Run the Project

### 1️Clone the repository
```bash
git clone <repository-url>
cd horizon-haven
