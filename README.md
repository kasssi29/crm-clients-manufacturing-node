
# 🗂️ CRM Clients API

A sample **Node.js + Express + MongoDB** backend for managing clients, their equipment, and maintenance schedules in a company setting. 

This is a **simplified version** of a CRM system I originally designed for a manufacturing enterprise.  
> The full production version included additional features such as advanced reporting, automated workflows, document management, and integration with external services.  
> This release focuses on the core backend logic for learning and demonstration purposes.
 

This example can be used as:
- A **starting point** for building a more complex CRM tailored to company needs.
or
- A **learning project** to study authentication, authorization, and CRUD API development.

---

## 🌐 Tech Stack
![Node.js](https://img.shields.io/badge/Node.js-339933?logo=node.js&logoColor=fff&style=flat)
![Express](https://img.shields.io/badge/Express.js-000000?logo=express&logoColor=fff&style=flat)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?logo=mongodb&logoColor=fff&style=flat)
![JWT](https://img.shields.io/badge/JWT-000000?logo=jsonwebtokens&logoColor=fff&style=flat)
![Postman](https://img.shields.io/badge/Postman-FF6C37?logo=postman&logoColor=fff&style=flat)

---

## 📦 Features
- JWT authentication
- Role-based access control
- Client and equipment management
- Statistics endpoints for supervisors
- Initial data seeding
- Postman collection for API testing
- `/healthz` endpoint for service checks

---
## 🧾 Roles

The system demonstrates **role-based access control** with three roles:

- **Admin**: User managment, hard delete of client.
- **Supervisor**: View all clients, assign clients to managers, see statistics.
- **Manager**: Can create and manage their own clients.

## API Endpoints

### Authentication

- `POST /api/auth/login` — User login - Public
- `POST /api/auth/register` — User registration - Public

### Users

- `GET /api/users` — Get all users - Admin only  
- `GET /api/users/profile` — Get current user profile - Authenticated
- `PUT /api/users/:id/role` — Change user role - Admin only 

### Clients

- `GET /api/clients` — Get all clients (supervisor) or own clients (manager) — Authenticated  
- `POST /api/clients` — Add a new client (manager: auto-assign to self, supervisor: must provide managerId)  
- `GET /api/clients/soon-expiring` — Get manager’s clients with equipment expiring soon — Manager only  
- `PATCH /api/clients/:id` — Update client (supervisor: any client, manager: only own clients)  
- `DELETE /api/clients/:id` — Admin: hard delete
- `DELETE /api/clients/:id/soft-delete` — Supervisor: soft delete (mark inactive) 
- `PATCH /api/clients/:id/assign` — Reassign client to another manager — Supervisor only  
- `GET /api/clients/:id` — Get client by ID (supervisor: any, manager: only own)  
- `PATCH /api/clients/:clientId/equipment/:equipmentId/service-action` — Update equipment status — Supervisor/Manager  

### Stats

- `GET /api/stats/total-clients` — Get total number of clients — Supervisor only  
- `GET /api/stats/expiring` — Get number of clients with equipment service due this month (excluding completed), and how many were notified — Supervisor only  
  - **Response:** `{ expiringThisMonth: number, notifiedThisMonth: number }`
- `GET /api/stats/total-managers` — Get total number of managers — Supervisor only  
  - **Response:** `{ totalManagers: number }`
- `GET /api/stats/clients-summary-per-manager` — Get summary for each manager: total clients, notifications sent last month, services done last month, expected due next month — Supervisor only  
  - **Response:**  
    ```json
    [
      {
        "managerId": "...",
        "name": "...",
        "email": "...",
        "totalClients": 0,
        "notificationsSentLastMonth": 0,
        "servicesDoneLastMonth": 0,
        "expectedDueNextMonth": 0
      }
    ]
    ```
- `GET /api/stats/manager/:id/details` — Get detailed statistics for a specific manager for a date range (defaults to last 30 days) — Supervisor only  
  - **Response:**  
    ```json
    {
      "managerId": "...",
      "name": "...",
      "period": { "from": "ISODate", "to": "ISODate" },
      "notificationsSent": 0,
      "servicesDoneLastMonth": 0,
      "expectedDue": 0,
      "clients": [
        {
          "clientId": "...",
          "contactPerson": "...",
          "company": "...",
          "equipment": [
            {
              "model": "...",
              "serial": "...",
              "serviceStatus": "...",
              "lastServiceNotified": "ISODate",
              "serviceDueDate": "ISODate"
            }
          ]
        }
      ]
    }
    ```
---

## 🌐 Deployment Environment Variables

These must be set in your hosting environment (Render, Vercel, etc):

- `NODE_ENV=production`
- `MONGO_URI=your-mongodb-uri`
- `JWT_SECRET=your-jwt-secret`
- `PORT=3000` (optional, many hosts auto-assign ports)

---

## ⚙️ Prerequisites

Before running this project, make sure you have:

- **Node.js** v18 or higher — [Download here](https://nodejs.org/)  
  Check your version:
  ```bash
  node -v

## 🌱Installation and Initial Data Seeding

For running the application for the first time, you need to install dependencies and populate the database with initial data (admin, supervisor, managers, and example clients).

1. **Install dependencies** (if not installed yet):
   ```bash
   npm install
   ```

2. **Configure `.env`**  
   Copy `.env.example` to `.env` and fill in:
   - `MONGO_URI` — your MongoDB connection string
   - `JWT_SECRET` — random string for signing JWT tokens
   - Initial credentials (emails and passwords) for admin, supervisor, and managers

3. **Run the seeder**  
   This will connect to MongoDB, clear the `users` and `clients` collections, and insert the initial data.
   ```bash
   node seed.js
   ```
   **(or)**  
   Add to `package.json`:
   ```json
   "scripts": {
     "seed": "node seed.js"
   }
   ```
   Then run:
   ```bash
   npm run seed
   ```

4. **Start the application**:
   ```bash
   npm run dev
   ```

> ⚠️ The seeder will **delete all data in `users` and `clients`** before inserting new ones.  
> Do not run it on a production database unless you intend to reset it.

---

## 📦 API Testing with Postman

This project includes a Postman collection for testing the CRM API.

### 1. Import the collection
1. Open Postman.
2. Click **Import** and select the file:
   ```
   CRM_API_fixed.postman_collection.json
   ```
3. The collection will appear in your workspace.

### 2. Set up environment variables
Before running requests, set the following variables in Postman (**Environments → Add**):

| Variable       | Example value                      | Description |
|----------------|------------------------------------|-------------|
| `baseUrl`      | `http://localhost:3000/api`        | API base URL |
| `token`        | *(leave empty initially)*          | Will be filled after login |
| `managerId`    | `ObjectId of any manager user`     | Used for supervisor creating a client |
| `clientId`     | `ObjectId of a client`             | Used for GET/PUT/DELETE client requests |

### 3. Workflow
1. **Register or login** using the corresponding request in the `Auth` folder.
2. Copy the token from the login response and set it to the `token` variable in your environment.
3. Run any other requests (Clients, Equipment, etc.) — they will automatically include the token in the `Authorization` header.

### 4. Notes
- All example credentials are **fake** (`admin@example.com`, `AdminPass123!`, etc.).
  
---

## 🚀 Possible Extensions
You can extend this CRM to include:
- 📊 **Dashboard** with statistics and KPIs.
- 📅 **Automated service reminders** for equipment.
- 📝 **Client activity logs** and interaction history.
- 📦 **Inventory tracking** for parts and consumables.
- 📑 **Document storage** for contracts and invoices.
- 🌐 **Multi-language support** for international teams.
- 💬 **Internal messaging** between managers and supervisors.
- 🔔 **Email/SMS notifications** for service alerts.

---

## 💻 Frontend Recommendations
For the frontend, i recommend using **React** or **Vue** to build a responsive, user-friendly interface that integrates with this API.  
A frontend implementation for this CRM will be developed and published in the same GitHub account as this repository.

---

## 📜 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🤝 Collaboration & Contact

💼 **Open for**:
- Full-stack development projects (Backend + Frontend)
- API architecture & database design
- Freelance or long-term collaborations
- Individual mentoring (English / Russian)

📧 **Email:** kasiopia29@gmail.com  

## 🔍 GitHub SEO Tags
`nodejs` `express` `mongodb` `jwt-auth` `crm` `fullstack` `rest-api`  
`role-based-access-control` `mern-stack` `backend-development` `frontend-development`  
`mentoring` `freelance` `api-development` `developer-tools` `javascript`
