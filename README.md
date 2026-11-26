# SkillBridge – Alumni & Student Collaboration Platform

SkillBridge is a web-based collaboration platform designed to connect current MCA students with alumni through real-world project opportunities, mentorship, and collaborative learning.

The platform provides a centralized environment where alumni can publish project opportunities, students can explore and apply for projects, and both can collaborate through project-based messaging, task assignments, submissions, and reviews.

Administrators manage the platform by verifying student and alumni accounts and maintaining a trusted academic community.

The primary goal of SkillBridge is to bridge the gap between academic learning and practical industry experience by encouraging alumni–student collaboration.

---

## Table of Contents

- [Project Overview](#project-overview)
- [Objectives](#objectives)
- [User Roles](#user-roles)
- [Key Features](#key-features)
- [Project Workflow](#project-workflow)
- [Technology Stack](#technology-stack)
- [System Architecture](#system-architecture)
- [Database Design](#database-design)
- [Project Structure](#project-structure)
- [Installation and Setup](#installation-and-setup)
- [Environment Configuration](#environment-configuration)
- [Running the Application](#running-the-application)
- [Admin Account Setup](#admin-account-setup)
- [Security Features](#security-features)
- [Future Enhancements](#future-enhancements)
- [Contributors](#contributors)

---

## Project Overview

SkillBridge provides three major user roles:

1. **Student:** Explore project opportunities, submit proposals, collaborate with alumni, complete assigned tasks, and receive feedback.
2. **Alumni:** Create project opportunities, review student proposals, guide selected students, assign tasks, evaluate submissions, and provide reviews.
3. **Administrator:** Verify user registrations, manage platform access, and maintain the overall platform.

The application follows a role-based architecture with centralized authentication, MongoDB-backed data management, and dedicated interfaces for each user role.

---

## Objectives

- Connect MCA students with alumni through practical project opportunities.
- Encourage knowledge sharing and mentorship between students and alumni.
- Provide students with opportunities to gain real-world development experience.
- Establish a structured project proposal and selection process.
- Enable communication and collaboration within individual projects.
- Track task progress, submissions, and project completion.
- Maintain a verified and reliable academic collaboration environment.

---

## User Roles

### 1. Student

Students can:

- Register and submit the required verification document.
- Log in after account approval.
- Access a personalized student dashboard.
- Browse available project opportunities.
- Search and filter projects.
- View detailed project information.
- Submit proposals to alumni.
- Track proposal statuses.
- Access projects after proposal acceptance.
- Communicate with alumni through project-based messaging.
- View assigned tasks.
- Submit GitHub repository links and deliverable URLs.
- Track task review statuses.
- View completed projects and task history.
- Manage profile information and skills.
- View feedback and reviews.

### 2. Alumni

Alumni can:

- Register and submit verification documents.
- Access the platform after administrator approval.
- Manage their alumni profile.
- Create and publish project opportunities.
- Configure project categories, capacity, and collaboration details.
- View student proposals.
- Accept or reject proposals.
- Manage selected students within projects.
- Communicate with project participants.
- Create and assign project tasks.
- Review student task submissions.
- Approve or reject submitted work.
- Track project progress.
- Complete projects after all required tasks are approved.
- Provide reviews and feedback to students.
- View project and mentoring statistics through the alumni dashboard.

### 3. Administrator

Administrators can:

- Access the administrative dashboard.
- View registered users.
- Review pending student and alumni registrations.
- Verify submitted documents.
- Approve or reject user registrations.
- Manage platform verification workflows.
- Monitor platform activities and user information.

---

## Key Features

### Authentication and Authorization

- Separate registration workflows for students and alumni.
- Centralized login and logout functionality.
- Secure password hashing using bcrypt.
- Session-based authentication.
- Role-based access control.
- Account approval and verification workflow.
- Protected routes and role-specific dashboards.

### Project Management

- Alumni can create and publish project opportunities.
- Students can browse available projects.
- Project search, filtering, and pagination.
- Project capacity and participant management.
- Project categories such as Web Development, Cloud, Mobile, Data, Systems, AI, and General.
- Project status and progress tracking.

### Proposal Management

- Students can submit proposals for projects.
- Alumni can review incoming proposals.
- Alumni can accept or reject proposals.
- Proposal status tracking.
- Accepted proposals establish project participation.

### Project-Based Messaging

- Dedicated conversations for project collaboration.
- Communication between alumni and approved project students.
- Project participant management.
- MongoDB-backed conversation and message management.

### Task Management and Submissions

- Alumni can create tasks for project participants.
- Students can view assigned tasks.
- Students can submit GitHub repository URLs and deliverable links.
- Task submission status tracking.
- Alumni can review submissions.
- Task approval and rejection workflow.
- Approved tasks contribute to project completion.

### Project Completion

- Projects track their assigned tasks and progress.
- Project completion becomes available after all required tasks are approved.
- Completed projects are reflected in student and alumni dashboards.
- Students can view their completed project and task history.

### Profiles, Dashboards and Reviews

- Separate dashboards for students and alumni.
- Dynamic dashboard statistics retrieved from MongoDB.
- Student and alumni profile management.
- Skills and profile information.
- Project and proposal statistics.
- Task completion tracking.
- Alumni feedback and student reviews.

### Notifications and Verification

- User verification and approval management.
- Database-backed notification functionality.
- Private document uploads for account verification.
- Status tracking for pending, approved, and rejected accounts.

---

## Project Workflow

The main application workflow is:

1. Students and alumni register on the platform.
2. Both submit the required verification documents.
3. Administrators review and approve or reject registrations.
4. Approved alumni create project opportunities.
5. Approved students browse projects and submit proposals.
6. Alumni review proposals and select suitable students.
7. Accepted students become project participants.
8. Project-based conversations enable collaboration.
9. Alumni assign tasks to project participants.
10. Students complete tasks and submit their deliverables.
11. Alumni review and approve or reject submissions.
12. Once all required tasks are approved, the project can be marked as completed.
13. Reviews and feedback support the mentoring process.

---

## Technology Stack

| Category          | Technologies            |
| ----------------- | ----------------------- |
| Frontend          | HTML5, CSS3, JavaScript |
| Template Engine   | EJS                     |
| Backend           | Node.js                 |
| Backend Framework | Express.js              |
| Database          | MongoDB                 |
| ODM               | Mongoose                |
| Authentication    | Express Session         |
| Password Security | bcryptjs                |
| Session Storage   | connect-mongo           |
| File Uploads      | Multer                  |
| Security          | Helmet                  |
| Validation        | express-validator       |
| Configuration     | dotenv                  |
| Version Control   | Git and GitHub          |

---

## System Architecture

SkillBridge follows a modular monolithic architecture.

The application is organized into separate modules for routing, database models, middleware, views, and configuration.

**Architecture flow:**

Client Browser → Express.js Application → Middleware → Routes → Mongoose Models → MongoDB Database

### Architectural Components

- **Routes:** Handle application requests and business logic.
- **Models:** Define MongoDB schemas and data relationships.
- **Middleware:** Handle authentication, authorization, and request processing.
- **Views:** Provide role-specific interfaces using EJS templates.
- **Public:** Contains frontend assets such as CSS, JavaScript, and images.
- **Configuration:** Handles database connections and application configuration.
- **Scripts:** Contains administrative and database utility scripts.

---

## Database Design

SkillBridge uses MongoDB with Mongoose for database management.

The application uses separate collections to manage different entities and maintain structured data relationships.

Major database entities include:

- Users
- Projects
- Proposals
- Project Members
- Tasks
- Conversations
- Messages
- Notifications
- Reviews
- Verification and activity-related records

The database design supports:

- Unique user accounts.
- Student-to-alumni account continuity.
- Role-based user management.
- Project and student relationships.
- Proposal tracking.
- Task and submission management.
- Project-based conversations.
- Review and notification records.
- Database indexing for frequently queried fields.

---

## Project Structure

```text
SKILLBRIDGE/
│
├── config/
│   └── Database configuration
│
├── middleware/
│   └── Authentication and authorization
│
├── models/
│   └── MongoDB / Mongoose schemas
│
├── public/
│   └── CSS, JavaScript and static assets
│
├── routes/
│   ├── auth.js
│   ├── student.js
│   ├── alumni.js
│   ├── projects.js
│   ├── admin.js
│   ├── messages.js
│   └── reviews.js
│
├── scripts/
│   └── Administrative utility scripts
│
├── views/
│   ├── admin/
│   ├── alumni/
│   ├── student/
│   ├── projects/
│   ├── messages/
│   └── partials/
│
├── uploads/
│   └── Private verification documents
│
├── .env
├── .gitignore
├── app.js
├── package.json
├── package-lock.json
└── README.md
```

---

## Installation and Setup

Follow these steps to run SkillBridge locally.

### Prerequisites

Install the following:

- Node.js
- npm (Node Package Manager)
- MongoDB Atlas account or a MongoDB server
- Git
- Visual Studio Code (recommended)

### Step 1: Clone the Repository

```bash
git clone https://github.com/HARIPRASANTH-2005/SKILLBRIDGE.git
```

### Step 2: Navigate to the Project Directory

```bash
cd SKILLBRIDGE
```

### Step 3: Install Dependencies

```bash
npm install
```

### Step 4: Configure Environment Variables

Create a `.env` file in the root directory and configure the required application settings.

See the [Environment Configuration](#environment-configuration) section.

### Step 5: Start the Application

```bash
node app.js
```

### Step 6: Open the Application

Open your browser and visit:

```text
http://localhost:3000
```

---

## Environment Configuration

Create a `.env` file in the root directory.

Example configuration:

```env
PORT=3000

NODE_ENV=development

MONGO_URI=your_mongodb_connection_string

DB_NAME=skillbridge

SESSION_SECRET=your_secure_session_secret

ADMIN_NAME=Administrator

ADMIN_EMAIL=admin@example.com

ADMIN_PASSWORD=your_secure_admin_password
```

**Important:**

- Replace the MongoDB connection string with your own MongoDB credentials.
- Use a strong session secret of at least 32 characters.
- Configure a secure administrator password.
- Never commit your `.env` file to GitHub.
- Ensure MongoDB is accessible before starting the application.

---

## Running the Application

After configuring the environment variables and installing the dependencies, execute:

```bash
node app.js
```

The application will run on the configured port, which defaults to `3000`.

---

## Admin Account Setup

SkillBridge provides an administrative bootstrap script.

To create the initial administrator account, configure the administrator environment variables and execute:

```bash
node scripts/create-admin.js
```

The administrator can then log in and manage student and alumni verification requests.

---

## Security Features

Security is an important part of SkillBridge.

The application incorporates:

- bcrypt-based password hashing.
- Session-based user authentication.
- MongoDB-backed session storage.
- Role-based access control.
- Protected application routes.
- Helmet security middleware.
- Private verification document storage.
- File type and file size validation.
- Environment-based configuration.
- Server-side form validation.

Verification documents are stored outside the public static directory to prevent direct public access.

---

## Future Enhancements

Potential improvements for future development include:

- Real-time messaging using WebSockets.
- Email notifications for important platform activities.
- Advanced project recommendation mechanisms.
- AI-assisted student and project matching.
- Enhanced analytics and reporting.
- Improved deployment and production monitoring.
- Additional collaboration and mentorship features.

---

## Contributors

**SkillBridge – MCA Project**

Developed as a collaborative academic project to strengthen alumni–student relationships and encourage practical learning through real-world project collaboration.

**Repository:**
[https://github.com/HARIPRASANTH-2005/SKILLBRIDGE](https://github.com/HARIPRASANTH-2005/SKILLBRIDGE)

---

## License

This project was developed for academic and educational purposes.

