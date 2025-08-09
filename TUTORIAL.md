# CRM Project Tutorial

## 📌 Purpose

This project is a basic CRM system for managing clients, equipment, and service schedules.  
It is designed as a backend API with authentication, role-based access, and example seed data.

---

## 🛠 Architecture

The application is built on:
- **Node.js + Express.js** — backend framework
- **MongoDB + Mongoose** — database and ORM
- **JWT** — authentication
- **Role-based middleware** — access control

---

## 🗂 Project Structure

```
/models       → Mongoose models (User, Client, Equipment)
/routes       → Express route handlers for each API section
/middleware   → Authentication & role-based access logic
seed.js       → Initial data seeding script
server.js     → Application entry point
```
---

## 🔄 How It Works

1. **Server** (`server.js`)  
   Starts the Express application, connects to MongoDB, and loads routes.

2. **Models** (`/models`)  
   Define the data structure for MongoDB collections:
   - `User` — stores users (admin, supervisor, manager) with encrypted passwords.
   - `Client` — stores companies and their equipment.
   - `Equipment` — embedded in clients, stores model, serial, service dates.

3. **Routes** (`/routes`)  
   Contain the API endpoints:
   - `/api/auth` — authentication (login, register)
   - `/api/users` — user management
   - `/api/clients` — CRUD for clients and equipment
   - `/api/stats` — statistics for supervisors

4. **Middleware** (`/middleware`)  
   - `authMiddleware` — verifies JWT tokens.
   - `roleAccess` — checks if the user has permission to perform the action.

5. **Seeder** (`seed.js`)  
   Populates the database with initial demo data:
   - 1 admin
   - 1 supervisor
   - 3 managers (each with 3 companies, some with equipment)

6. **Postman Collection**  
   A `.postman_collection.json` file to test API without frontend.

---

## 📈 Example Flow

1. **Login** (`POST /api/auth/login`) — user enters credentials and gets JWT token.
2. **Protected request** — token is sent in `Authorization: Bearer <token>` header.
3. **Middleware** checks token and role.
4. **Route** executes business logic (read/write in MongoDB).
5. **Response** returns JSON data to the client (frontend or Postman).

---

## 🧾 Roles

- **Admin** — full user management, can hard delete clients.
- **Supervisor** — can view all clients, assign clients to managers, view statistics.
- **Manager** — can manage only their own clients.

---

## 🚀 Real-World Enhancements

In a real-world scenario, such a CRM system would likely be further enhanced with features such as:

- 📊 **Dashboard** with statistics and KPIs.
- 📅 **Automated service reminders** for equipment.
- 📝 **Client activity logs** and interaction history.
- 📦 **Inventory tracking** for parts and consumables.
- 📑 **Document storage** for contracts and invoices.
- 🌐 **Multi-language support** for international teams.
- 💬 **Internal messaging** between managers and supervisors.
- 🔔 **Email/SMS notifications** for service alerts.

---

## 💡 Frontend Recommendations
For the UI, you can use:
- **React** (with Material UI or Ant Design)
- **Vue.js** (with Vuetify or Element Plus)

The frontend will be developed and published in the same GitHub account.

## 🗄️ About MongoDB and Atlas

This project uses **MongoDB**, a NoSQL database that stores data in flexible, JSON-like documents instead of rigid tables.  
We use **MongoDB Atlas**, a cloud-hosted MongoDB service that makes it easy to deploy, manage, and scale databases without setting up servers manually.

### Why MongoDB for this project?
- It works seamlessly with **Node.js** and the asynchronous JavaScript runtime.
- The flexible schema allows us to store nested objects like client equipment without complex joins.
- Ideal for CRM systems where the data model may evolve over time.

### Mongoose ORM
We interact with MongoDB through **Mongoose**, an Object Relational Mapping (ORM) library.  
Benefits:
- **Schema validation** — ensures data has the correct structure before saving.
- **Protection from injection attacks** — similar to how SQL ORMs prevent SQL injection, Mongoose prevents malicious queries in MongoDB.
- **Cleaner code** — models, validation, and queries are centralized.

In short, MongoDB + Mongoose is a safe, flexible, and developer-friendly choice for Node.js applications like this CRM.