# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
# Patient Portal

A web-based patient management system built with **FastAPI, React, MySQL, and Docker Compose**. The project provides separate interfaces for administrators and doctors, with features for managing patients, appointments, medical records, and AI-assisted triage.

The application is containerized to make development, testing, and collaboration easier across different machines.

## Table of Contents

- [Project Overview](#1-project-overview)
- [Features](#2-features)
- [Technology Stack](#3-technology-stack)
- [System Architecture](#4-system-architecture)
- [Prerequisites](#5-prerequisites)
- [Getting Started](#6-getting-started)
- [Docker Compose Commands](#7-docker-compose-commands)
- [Accessing the Application](#8-accessing-the-application)
- [Database Initialization](#9-database-initialization)
- [Demo Accounts](#10-demo-accounts)
- [Project Structure](#11-project-structure)
- [Troubleshooting](#12-troubleshooting)
- [Security Notes](#13-security-notes)
- [Contributing](#14-contributing)
- [License](#15-license)

---

## 1. Project Overview

Patient Portal is a web application designed to support healthcare workflows by providing a centralized interface for managing patient information, doctor information, appointments, and medical records.

The system uses a REST API architecture. The React frontend communicates with the FastAPI backend, while MySQL stores application data.

Docker Compose orchestrates the application services, allowing developers to build and run the system without manually installing the frontend and backend dependencies on their host machines.

### Project Goals

- Provide a centralized interface for patient-related information.
- Support administrative and doctor workflows.
- Organize appointment and medical record management.
- Integrate AI-assisted triage functionality.
- Simplify local development and deployment using Docker Compose.
- Make the development environment easier to reproduce across team members' machines.

## 2. Features

### Administrator Dashboard

- Overview of system information.
- Patient management.
- Doctor management.
- Appointment management.
- Medical record viewing.
- AI triage interface.

### Doctor Dashboard

- Doctor dashboard and patient-related workflows.
- Medical record management.
- Access to relevant patient information, subject to application permissions.

### Backend API

- RESTful API built with FastAPI.
- MySQL database integration.
- API documentation through Swagger UI.
- Backend endpoints for application data and workflows.

### Containerized Development

- Docker-based backend environment.
- Docker-based frontend environment.
- MySQL database service.
- Centralized service orchestration using Docker Compose.

> Note: The exact availability of individual features depends on the current implementation in the repository.

## 3. Technology Stack

| Component | Technology | Purpose |
|---|---|---|
| Frontend | React | User interface |
| Frontend tooling | Vite | Development server and frontend build tooling |
| Backend | Python, FastAPI | REST API and application logic |
| ORM | SQLAlchemy | Database interaction |
| Database | MySQL 8.4 | Persistent application data |
| API documentation | Swagger UI / OpenAPI | API exploration and testing |
| Containerization | Docker | Application containerization |
| Service orchestration | Docker Compose | Running multiple services |
| Web server | Nginx | Frontend serving and related web-server configuration |

## 4. System Architecture

The application consists of three primary services.

```text
                    User / Browser
                          |
                          v
                +-------------------+
                |   React Frontend  |
                |   Vite / Nginx    |
                +-------------------+
                          |
                          | HTTP / REST API
                          v
                +-------------------+
                |   FastAPI Backend |
                |   SQLAlchemy ORM  |
                +-------------------+
                          |
                          | SQL
                          v
                +-------------------+
                |     MySQL 8.4     |
                |     Database      |
                +-------------------+
```

### Frontend

The frontend provides the user interface for administrators and doctors. It sends HTTP requests to the backend API.

### Backend

The FastAPI application handles API requests, application logic, authorization checks, and database operations.

### Database

MySQL stores application data, including relevant patient, doctor, appointment, and medical record information.

### Docker Compose

Docker Compose manages the service lifecycle and connects the containers through a Docker network.

The actual container names, ports, environment variables, and service dependencies are defined in `docker-compose.yml`.

## 5. Prerequisites

Install the following software before starting the application.

### Required Software

- **Git** — to clone the repository.
- **Docker Desktop** — to run Docker containers.
- **Docker Compose** — available through Docker Desktop as the `docker compose` command.

On Windows, Docker Desktop should be installed and running before executing the commands below.

Verify your installation:

```powershell
git --version
docker --version
docker compose version
```

Check that Docker is running:

```powershell
docker info
```

You do not normally need to install Python, Node.js, or MySQL directly on your host machine when the Docker configuration builds and runs all required services.

## 6. Getting Started

Follow these steps to run the project on a new machine.

### Step 1: Clone the Repository

Replace `<REPOSITORY_URL>` with the HTTPS or SSH URL of this GitHub repository.

```powershell
git clone <REPOSITORY_URL>
```

Navigate to the project directory:

```powershell
cd project
```

If the repository uses a different directory name, enter the directory created by Git.

### Step 2: Check the Project Files

Ensure that the project root contains the Docker Compose configuration.

```powershell
Get-ChildItem -Force
```

The repository should include the relevant configuration and source files, such as:

```text
project/
├── docker-compose.yml
├── README.md
├── .gitignore
├── .env.example
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── ...
└── frontend/
    ├── Dockerfile
    ├── package.json
    ├── package-lock.json
    └── ...
```

This is an illustrative structure. Keep the actual files required by the repository's Docker configuration.

### Step 3: Configure Environment Variables

Check whether the project requires a `.env` file.

If the repository provides `.env.example`, copy it to `.env`:

```powershell
Copy-Item .env.example .env
```

Update the values according to the configuration required by the project.

Do not commit real passwords, secret keys, or other sensitive values to GitHub.

If the project does not require a root `.env` file, skip this step.

### Step 4: Build and Start the Application

From the directory containing `docker-compose.yml`, run:

```powershell
docker compose up --build
```

This command builds the configured images and starts the services.

The first build may take several minutes because Docker needs to download base images and install dependencies.

Wait for the services to finish starting. Check the logs for errors before accessing the application.

### Step 5: Verify the Services

Open another terminal in the project directory and run:

```powershell
docker compose ps
```

Check the service logs:

```powershell
docker compose logs --tail=100
```

To inspect a specific service, first check the service names in `docker-compose.yml`, then run:

```powershell
docker compose logs --tail=100 backend
```

Replace `backend` with the appropriate Compose service name if it differs.

## 7. Docker Compose Commands

Run these commands from the directory containing `docker-compose.yml`.

### Start the Application

```powershell
docker compose up
```

### Build and Start the Application

```powershell
docker compose up --build
```

### Run in the Background

```powershell
docker compose up -d --build
```

### Check Running Services

```powershell
docker compose ps
```

### View Logs

```powershell
docker compose logs -f
```

View logs for a specific service:

```powershell
docker compose logs -f backend
```

### Rebuild a Specific Service

```powershell
docker compose up -d --build backend
```

Replace `backend` with the relevant service name.

### Stop the Application

If the application is running in the foreground, press `Ctrl + C`.

Alternatively, run:

```powershell
docker compose down
```

This stops and removes the Compose containers and network. Named database volumes are retained by default.

### Rebuild After Source Code Changes

If the Docker configuration does not mount source code into the containers, rebuild the relevant service after modifying its source files.

For example:

```powershell
docker compose up -d --build backend
```

For frontend changes:

```powershell
docker compose up -d --build frontend
```

Use the actual service names defined in `docker-compose.yml`.

> **Important:** Do not run `docker compose down -v` unless you intentionally want to remove the associated Compose-managed volumes. Removing the database volume can permanently delete local database data.

## 8. Accessing the Application

With the current development configuration, the expected local endpoints are:

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| Swagger UI | http://localhost:8000/docs |

These URLs assume the corresponding host ports are published by Docker Compose.

If the application does not respond, inspect the port mappings in `docker-compose.yml` and check the service logs.

## 9. Database Initialization

The project uses MySQL as its persistent database.

When running the application on a new machine, the database initialization process must be completed before all application features can work.

### First-Time Setup

1. Start the services using Docker Compose.
2. Ensure that the MySQL service is healthy and accepting connections.
3. Verify that the configured database exists.
4. Ensure that the application's required tables are created.
5. Load sample data if the project provides a supported seed or initialization process.

The exact initialization commands depend on the database configuration and the scripts included in the repository.

### Database Persistence

Docker volumes allow MySQL data to persist when containers are stopped or recreated.

Running:

```powershell
docker compose down
```

does not normally delete named database volumes.

However, a new machine will not automatically contain the database records from another developer's machine.

### Sample Data

For development and demonstration purposes, the project should provide a documented method to create sample users and application records.

If a database seed script is included, follow the instructions provided by that script.

Do not assume that sample accounts or records exist unless the initialization process explicitly creates them.

## 10. Demo Accounts

Demo accounts should be documented here after the project's seed or initialization process has been verified.

| Role | Username / Email | Password |
|---|---|---|
| Administrator | Not configured in this README | Not configured in this README |
| Doctor | Not configured in this README | Not configured in this README |
| Patient | Not configured in this README | Not configured in this README |

**Important:** No default login credentials are specified in this document because the actual seed data and authentication configuration must be verified first.

For a reproducible demonstration environment, configure sample accounts using the project's supported initialization mechanism.

Use development-only passwords for sample accounts. Never publish real user credentials or production secrets.

## 11. Project Structure

The following is an overview of the expected project organization.

```text
project/
├── docker-compose.yml
├── README.md
├── .gitignore
├── .env.example
│
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── main.py
│
└── frontend/
    ├── Dockerfile
    ├── package.json
    ├── package-lock.json
    └── src/
        ├── AdminDashboard.jsx
        └── DoctorDashboard.jsx
```

Additional files and directories may exist in the actual repository, including routers, database models, configuration files, frontend components, and styling files.

Do not remove files required by the application or its Docker build process.

## 12. Troubleshooting

### Problem: Docker Is Not Running

**Symptoms:** Docker commands fail or cannot connect to the Docker daemon.

**Solution:**

1. Open Docker Desktop.
2. Wait until Docker has finished starting.
3. Run:

   ```powershell
   docker info
   ```

4. Retry the Compose command.

### Problem: A Container Exits Immediately

Inspect the service status:

```powershell
docker compose ps
```

Inspect the logs:

```powershell
docker compose logs --tail=200
```

Look for missing environment variables, failed imports, database connection errors, or configuration problems.

### Problem: The Backend Cannot Connect to MySQL

Check that:

- The MySQL service is running.
- The database credentials match the configured environment variables.
- The database exists.
- The backend uses the MySQL service name as its hostname when connecting over the Compose network.
- MySQL has completed initialization before the backend attempts to connect.

Inside a Docker container, `localhost` refers to that same container. It does not refer to the separate MySQL container.

Use the hostname and port expected by the project's Compose network configuration.

### Problem: The Frontend Cannot Reach the Backend

Check that:

- The backend container is running.
- The API is listening on the expected interface and port.
- The frontend is configured with the correct API base URL.
- The API URL is reachable from the browser when the browser makes the request.
- CORS settings allow requests from the frontend origin, where applicable.

Remember that `localhost` inside a container refers to that container, not another service.

### Problem: A Port Is Already in Use

If Docker reports that a port is already allocated, another application may be using the same host port.

Check the published ports in `docker-compose.yml` and adjust the host-side port mapping if necessary.

For example, changing a mapping from:

```yaml
ports:
  - "8000:8000"
```

to:

```yaml
ports:
  - "8001:8000"
```

would publish the container's port 8000 on host port 8001.

If you change a port, update the relevant URLs and configuration as needed.

### Problem: Frontend Dependencies or Build Failures

Check that:

- `package.json` exists.
- `package-lock.json` is consistent with the project's dependencies.
- The frontend Dockerfile installs dependencies correctly.
- The Docker build has network access to download required packages.

Inspect the frontend logs:

```powershell
docker compose logs --tail=200 frontend
```

### Problem: Database Tables Are Missing

Starting the MySQL container does not necessarily create every application table.

Check whether the backend uses SQLAlchemy table creation, database migrations, or an initialization script.

Follow the actual initialization process provided by the repository. Do not delete the database volume as a first troubleshooting step.

### Problem: Changes Do Not Appear After Pulling from GitHub

Retrieve the latest code:

```powershell
git pull origin main
```

If the affected service requires a rebuild, run:

```powershell
docker compose up -d --build
```

Inspect the logs if the problem persists.

## 13. Security Notes

This project is intended for development and educational use unless separately configured and reviewed for production deployment.

- Never commit `.env` files containing real credentials.
- Keep `.env.example` free of sensitive information.
- Do not publish real patient records, personal information, or production database backups.
- Use strong, unique passwords for development accounts.
- Do not expose MySQL ports publicly unless required and appropriately secured.
- Verify authentication and authorization checks on the backend.
- Do not rely on frontend navigation or hidden buttons as a security boundary.
- Configure production secrets, HTTPS, database access controls, backups, and deployment security separately before production use.

## 14. Contributing

Contributions and improvements are welcome.

A typical contribution workflow is:

1. Clone the repository.
2. Create a feature branch.
3. Make and test your changes.
4. Build and run the affected services.
5. Commit your changes.
6. Push the branch to GitHub.
7. Open a pull request if required by the repository's contribution workflow.

Example:

```powershell
git checkout -b feature/your-feature
```

After making changes:

```powershell
git add .
git commit -m "Describe your changes"
git push -u origin feature/your-feature
```

Before committing, review the staged files and ensure that no secrets, local database files, or unrelated generated artifacts are included.

## 15. License

No license is specified in this README.

Add a `LICENSE` file and update this section once the project owner has selected a license.

---

**Maintained by the Patient Portal development team.**