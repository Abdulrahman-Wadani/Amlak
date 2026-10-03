# System Requirements Specification
## 1. System Roles Explained

The system caters to different user types, each with specific permissions and responsibilities to ensure smooth property and maintenance management.

* **Admin:** The highest level of authority in the system. Admins represent the platform owners.

* **Manager:** The primary decision-maker and supervisor for properties. Managers handle high-level operations including property/asset management (CRUD), financial tracking, scheduling maintenance, and reviewing reports and tickets.

* **Worker:** The on-the-ground operational staff. Workers are responsible for day-to-day tasks such as executing property checklists, logging bookings, reporting damaged assets, and submitting visual proof of completed maintenance.

* **User:** A general or unassigned account type (often the starting point before being assigned a Manager or Worker role, or acting as a client/tenant). They interact with basic account settings, onboarding, and profile setup.

## 2. Prioritized User Stories

*Priority Levels: **Must Have** (Critical for launch), **Should Have** (Important but not a showstopper), **Nice to Have** (Enhancement for future iterations).*

| Category | Role | User Story | Priority |
| :--- | :--- | :--- | :--- |
| **Authentication** | User | As a user, I want to register an account using my full name, email, and password so that I can securely save my data. | Must Have |
| **Authentication** | User | As a user, I want to log in using my credentials so that I can securely access my account and resume my activities. | Must Have |
| **Authentication** | Admin | As an admin, I want the system to send an OTP via email so that user identities can be securely verified. | Must Have |
| **Authentication** | User | As a user, I want to manage my basic information (e.g., profile picture, name) so that my account profile remains accurate and complete. | Must Have |
| **Authentication** | User | As a user, I want to sign up via Single Sign-On (Google/Apple) so that I can access the system quickly without creating a new password. | Nice to Have |
| **Authentication** | User | As a user, I want to request a new verification code so that I can complete registration if the initial code is delayed or lost. | Must Have |
| **Authentication** | User | As a user, I want to select my interests during onboarding so that the system can personalize my content. | Nice to Have |
| **Onboarding** | Manager/Worker | As a manager/worker, I want clear explanations for device permission requests (Location/Camera) so that I understand why the app needs them. | Must Have |
| **Onboarding** | User | As a user, I want the option to skip the onboarding tutorial so that I can access the application immediately. | Nice to Have |
| **Onboarding** | User | As a user, I want a brief introductory walkthrough so that I can quickly understand the application's core features and value. | Nice to Have |
| **Onboarding** | Manager/Worker | As a manager/worker, I want contextual tooltips during my first login so that I can easily navigate and discover key features. | Nice to Have |
| **Property & Asset** | Manager | As a manager, I want to add, edit, and delete properties so that I can accurately track their maintenance and financial data. | Must Have |
| **Property & Asset** | Worker | As a worker, I want to report damaged assets or required maintenance so that the property remains in optimal condition. | Must Have |
| **Property & Asset** | Manager | As a manager, I want a unified dashboard showing property and asset health so that I can monitor the status of all locations at a glance. | Must Have |
| **Maintenance** | Manager | As a manager, I want to create customized pre- and post-booking checklists so that workers can ensure quality standards are met. | Must Have |
| **Maintenance** | Manager | As a manager, I want to receive and review maintenance tickets so that I can approve or reject them based on priority and budget. | Must Have |
| **Maintenance** | Worker | As a worker, I want to submit maintenance reports with photo attachments so that I can provide visual proof of completed work or damages. | Must Have |
| **Maintenance** | Manager | As a manager, I want to schedule periodic asset maintenance so that properties remain safe, functional, and in good condition. | Must Have |
| **Maintenance** | Worker | As a worker, I want to receive email reminders for upcoming maintenance tasks so that I do not miss any scheduled work. | Must Have |
| **Maintenance** | Manager | As a manager, I want to receive automated email alerts for overdue or incomplete maintenance tasks so that I can address operational delays promptly. | Must Have |
| **Booking** | Worker | As a worker, I want to manage (add/cancel) bookings on a calendar, including guest info and pricing, so that I can maintain an accurate reservation schedule. | Must Have |
| **Financial** | Manager | As a manager, I want to log all property expenses (maintenance, bills, taxes) so that I can maintain accurate financial records. | Must Have |
| **Financial** | Manager | As a manager, I want to generate financial reports so that I can effectively track profit, loss, and overall financial health. | Must Have | 
| **Financial** | Admin | As an Admin I want to manage plans and payments so I can edit account limits and refund users. | Should Have | 
| **Content management** | Admin | As an Admin I want to create, edit and delete web content so that information stay up to date. | Must Have |
| **User management**| Admin | As an Admin I want to view, edit and deactivate user accounts so that I can control their access. | Must Have | 
| support| Admin | As an Admin I want to view user support requests so that I can resolve problems. | Must Have | 
| **Notification** | Admin | As an Admin I want to send notifications to users so I can communicate updates. | Must Have | 
| **Reporting & Analytics** | Admin | As an Admin I want to view statistics and filter data so I can export information. | Should Have | 

## 3. Non-Functional Requirements (NFRs)

To ensure the system is secure, reliable, and scalable, the following technical requirements must be met:

### Security & Authentication

* **JWT (JSON Web Tokens):** All API communications between the client (web app) and the server must be secured using JWT for stateless user authentication and session management.

* **RBAC (Role-Based Access Control):** The system must enforce strict route and data protection based on the assigned roles (Admin, Manager, Worker, User). A Worker should never be able to access Manager financial reports.

* **Data Encryption:** Sensitive data (passwords, financial records) must be encrypted at rest in the database, and all data in transit must be secured using HTTPS/TLS.

### Performance & Scalability

* **Response Time:** API endpoints, especially those dealing with dashboard metrics and booking calendars, should respond within 500ms under normal load.

* **Media Optimization:** Uploaded images for maintenance reports or profile pictures must be compressed before being stored in cloud storage (e.g., AWS S3) to preserve bandwidth and storage.

### Usability & Accessibility

* **Mobile-First / Responsive Design:** Since workers will be operating on-site logging photos and checklists, the worker interface must be heavily optimized for mobile devices.

* **Cross-Platform Consistency:** The application UI should behave consistently across iOS, Android, and web platforms.

### Reliability & Integrations

* **Notification Gateways:** The system must reliably integrate with third-party email providers (e.g., SendGrid, AWS SES) and SMS gateways (e.g., Twilio) to ensure OTPs and maintenance reminders are delivered promptly.

* **Audit Logging:** Critical actions, such as approving maintenance tickets, recording expenses, or deleting a property, must be logged with a timestamp and the user ID for auditing purposes.

## 4 high-level architecture diagram

```mermaid
flowchart TD

    %% ========================================
    %% PRESENTATION LAYER
    %% ========================================

    subgraph Presentation["Presentation Layer"]

        React["React Web Application"]

        Login["Login"]
        Register["Create Account"]
        OTP["OTP Verification"]
        Profile["Profile"]
        Dashboard["Dashboard"]
        Places["Places Management"]
        Bookings["Bookings"]
        Expenses["Expenses"]
        Reports["Reports"]
        Finance["Finance Report"]

        React --> Login
        React --> Register
        React --> OTP
        React --> Profile
        React --> Dashboard
        React --> Places
        React --> Bookings
        React --> Expenses
        React --> Reports
        React --> Finance

    end


    %% ========================================
    %% API LAYER
    %% ========================================

    subgraph API["API Layer - Node.js / Express"]

        REST["REST API"]
        Controllers["API Controllers"]

        REST --> Controllers

    end


    %% ========================================
    %% BUSINESS LOGIC LAYER
    %% ========================================

    subgraph Logic["Business Logic Layer"]

        Facade["Amlak Facade"]

        subgraph Services["Business Services"]
            Auth["Authentication & Authorization"]
            UserManagement["User Management"]
            PlaceManagement["Place Management"]
            BookingManagement["Booking Management"]
            ExpenseManagement["Expense Management"]
            ReportService["Reports & Financial Analysis"]
            Notfication["Notfication Management"]

        end

        Facade --> Auth
        Facade --> UserManagement
        Facade --> PlaceManagement
        Facade --> BookingManagement
        Facade --> ExpenseManagement
        Facade --> ReportService
        Facade --> Notfication
    end


    %% ========================================
    %% DATABASE LAYER
    %% ========================================

    subgraph Database["Database Layer"]

        UsersDB["Users"]
        PlacesDB["Places"]
        BookingsDB["Bookings"]
        ExpensesDB["Expenses"]
        ReportsDB["Reports / Financial Data"]

    end


    %% ========================================
    %% EXTERNAL SERVICES
    %% ========================================

    subgraph External["External Services"]

        OTPService["OTP Service"]

    end


    %% ========================================
    %% PRESENTATION / USER ACCESS
    %% ========================================

    Login --> REST
    Register --> REST
    OTP --> REST
    Profile --> REST
    Dashboard --> REST
    Places --> REST
    Bookings --> REST
    Expenses --> REST
    Reports --> REST
    Finance --> REST


    %% ========================================
    %% API -> BUSINESS LOGIC
    %% ========================================

    Controllers -->|"Request"| Facade


    %% ========================================
    %% BUSINESS LOGIC -> DATABASE
    %% ========================================

    Auth --> UsersDB

    UserManagement --> UsersDB

    PlaceManagement --> PlacesDB

    BookingManagement --> BookingsDB

    ExpenseManagement --> ExpensesDB

    ReportService --> ReportsDB

    ReportService --> BookingsDB
    ReportService --> ExpensesDB
    ReportService --> PlacesDB


    %% ========================================
    %% OTP EXTERNAL SERVICE
    %% ========================================

    Notfication -->|"Send OTP"| OTPService



    %% ========================================
    %% RESPONSE FLOW
    %% ========================================

    Facade -->|"Response"| Controllers

    Controllers -->|"JSON Response"| REST

    REST --> React    
```

## 5 Class-diagram

```mermaid
classDiagram

    class BaseClass {
        +string uuid
        +datetime created_at
        +datetime updated_at
    }

    class User {
        +string password
        +string email
        +string phone
        +string fullname
        +string picture_path
        +string role_id
        +string status %%: "ACTIVE", "DEACTIVATED" - [User Management Admin]
        
        +List~Place~ managed_places
        +List~MaintenanceTicket~ reported_tickets
        +List~Notification~ notifications
        +List~SupportTicket~ support_tickets
        +List~WebContent~ authored_contents

        +register()
        +login()
        +updateProfile()
        +resetPassword()
        +requestVerificationCode()
        +hasPermission(string permission_name)
        +changeStatus() %% [User Management Admin]
    }

    class Role {
        +string name
        +string description
        
        +List~Permission~ permissions
        +List~User~ users
        
        +addPermission()
        +removePermission()
    }

    class Permission {
        +string name
        +string description
    }

    class Place {
        +string owner_id
        +string place_name
        +string status
        
        +List~Asset~ assets
        +List~PlaceChecklist~ checklists
        +List~MaintenanceTicket~ maintenance_tickets
        +List~Booking~ bookings
        +List~Expense~ expenses
        
        +add()
        +update()
        +delete()
        +view()
    }

    class Asset {
        +string place_id
        +string name
        +string type
        +date purchase_date
        +string status
        
        +List~PeriodicMaintenance~ maintenance_schedules
        +List~MaintenanceTicket~ repair_history
        
        +add()
        +update()
        +delete()
    }

    class PeriodicMaintenance {
        +string asset_id
        +string description
        +string frequency %% Enum: "MONTHLY", "QUARTERLY", "YEARLY"
        +date next_due_date
        
        +schedule()
        +triggerTicket()
    }

    class MaintenanceTicket {
        +string place_id
        +string asset_id
        +string ticket_type %% Enum: "CORRECTIVE", "PREVENTIVE"
        +string reporter_id
        +string description
        +string status
        +string photo_url
        +submit()
        +approve()
        +reject()
        +complete()
    }

    class PlaceChecklist {
        +string place_id
        +string checklist_item
        +boolean is_completed
        +create()
        +update()
        +delete()
        +view()
    }

    class Booking {
        +string place_id
        +date booking_date
        +decimal cost
        +add()
        +cancel()
        +view()
    }

    class Expense {
        +string place_id
        +string description
        +decimal amount
        +date expense_date
        +add()
        +update()
        +delete()
        +view()
    }

    class VerificationToken {
        +string user_id
        +string token
        +string token_type  %% Enum: "OTP", "PASSWORD_RESET", "EMAIL_VERIFICATION"
        +datetime expires_at
        +boolean is_used
        +generate()
        +verify()
    }

    class Notification {
        +string user_id
        +string sender_id
        +string message
        +boolean is_read
        +send()
        +sendBulk(List~string~ user_ids)
        +sendToRole(string role_id)
        +markAsRead()
    }

    class FinancialReport {
        +decimal total_income
        +decimal total_expenses
        +decimal profit
        +generate()
        +calculateIncome()
        +calculateExpenses()
        +calculateProfit()
    }

    class SupportTicket {
        +string user_id
        +string subject
        +string description
        +string status %% "OPEN", "IN_PROGRESS", "RESOLVED"
        
        +submit()
        +updateStatus()
        +resolve()
    }

    class WebContent {
        +string author_id
        +string title
        +string slug
        +string body
        +boolean is_published
        
        +create()
        +update()
        +delete()
        +publish()
    }

    %% Inheritance from BaseClass
    BaseClass <|-- User
    BaseClass <|-- Role
    BaseClass <|-- Permission
    BaseClass <|-- Place
    BaseClass <|-- MaintenanceTicket
    BaseClass <|-- PlaceChecklist
    BaseClass <|-- Booking
    BaseClass <|-- Expense
    BaseClass <|-- Notification
    BaseClass <|-- VerificationToken
    BaseClass <|-- WebContent
    BaseClass <|-- SupportTicket

    %% RBAC Relationships (Roles & Permissions)
    Role "1" --> "*" User : assigned to
    Role "*" --> "*" Permission : grants

    %% User Relationships
    User "1" --> "*" Place : owns / manages
    User "1" --> "*" VerificationToken : requests
    User "1" --> "*" Notification : receives
    User "1" --> "*" MaintenanceTicket : reports / handles
    User "1" --> "*" SupportTicket
    User "1" --> "*" WebContent : authors / creates

    %% Place Relationships
    Place "1" --> "*" PlaceChecklist : has
    Place "1" --> "*" Booking : has
    Place "1" --> "*" Expense : has
    Place "1" --> "*" MaintenanceTicket : needs
    Place "1" --> "*" Asset : contains

    %% Functional Dependencies
    FinancialReport ..> Booking : uses
    FinancialReport ..> Expense : uses

    Asset "1" --> "*" PeriodicMaintenance : scheduled for
    Asset "1" --> "*" MaintenanceTicket : needs
```

## 6 ER-diagram

```mermaid
erDiagram

    USER {
        int id PK
        string username
        string password
        string email
        string phone
        string fullname
        enum role
        int owner_id FK
        string picture_path "NULL"
        datetime created_at
    }

    OTP {
        int id PK
        int user_id FK
        string otp_token
        datetime expires_at
        boolean is_used
    }

    PASSWORD_RESET {
        int id PK
        int user_id FK
        string reset_token
        datetime expires_at
        boolean is_used
    }

    PLACE {
        int id PK
        int owner_id FK
        string place_name
        string status
        datetime created_at
    }

    PLACE_CHECKLIST {
        int id PK
        int place_id FK
        string checklist_item
        boolean is_completed
    }

    BOOKING {
        int id PK
        int place_id FK
        date booking_date
        decimal cost
        datetime created_at
    }

    EXPENSE {
        int id PK
        int place_id FK
        string description
        decimal amount
        date expense_date
        datetime created_at
    }

    NOTIFICATION {
        int id PK
        int expense_id FK
        int user_id FK
        string message
        boolean is_read
        datetime created_at
    }

    USER ||--o{ OTP : has
    USER ||--o{ PASSWORD_RESET : requests
    USER ||--o{ PLACE : owns
    PLACE ||--o{ PLACE_CHECKLIST : has
    PLACE ||--o{ BOOKING : has
    PLACE ||--o{ EXPENSE : has
    EXPENSE ||--o{ NOTIFICATION : triggers
    USER ||--o{ NOTIFICATION : receives
```
