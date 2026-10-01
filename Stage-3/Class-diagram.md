```mermaid
classDiagram

    class BaseClass {
        +datetime created_at
        +datetime updated_at
        +string id
    }

    class User {
        +string username
        +string password
        +string email
        +string phone
        +string fullname
        +string role
        +int owner_id
        +string picture_path
        +register()
        +login()
        +updateProfile()
        +resetPassword()
        +requestVerificationCode()
    }

    class Owner {
        +createWorker()
        +updateWorker()
        +deleteWorker()
        +viewWorkers()
        +createPlace()
        +updatePlace()
        +deletePlace()
        +viewPlace()
        +viewDashboard()
        +viewFinancialReports()
    }

    class Worker {
        +int owner_id
        +viewPlace()
        +addBooking()
        +cancelBooking()
        +reportDamage()
        +submitMaintenanceReport()
        +viewMaintenanceTasks()
    }

    class Admin {
        +manageUsers()
    }

    class Place {
        +int owner_id
        +string place_name
        +string status
        +add()
        +update()
        +delete()
        +view()
    }

    class PlaceChecklist {
        +int place_id
        +string checklist_item
        +boolean is_completed
        +create()
        +update()
        +delete()
        +view()
    }

    class Booking {
        +int place_id
        +date booking_date
        +decimal cost
        +add()
        +cancel()
        +view()
    }

    class Expense {
        +int place_id
        +string description
        +decimal amount
        +date expense_date
        +add()
        +update()
        +delete()
        +view()
    }

    class OTP {
        +int user_id
        +string otp_token
        +datetime expires_at
        +boolean is_used
        +generate()
        +verify()
    }

    class PasswordReset {
        +int user_id
        +string reset_token
        +datetime expires_at
        +boolean is_used
        +generate()
        +verify()
        +resetPassword()
    }

    class Notification {
        +int expense_id
        +int user_id
        +string message
        +boolean is_read
        +send()
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


    BaseClass <|-- User
    BaseClass <|-- Place
    BaseClass <|-- PlaceChecklist
    BaseClass <|-- Booking
    BaseClass <|-- Expense
    BaseClass <|-- Notification

    User <|-- Owner
    User <|-- Worker
    User <|-- Admin

    Owner "1" --> "*" Worker : manages
    Owner "1" --> "*" Place : owns

    User "1" --> "*" OTP : has
    User "1" --> "*" PasswordReset : requests
    User "1" --> "*" Notification : receives

    Place "1" --> "*" PlaceChecklist : has
    Place "1" --> "*" Booking : has
    Place "1" --> "*" Expense : has

    Expense "1" --> "*" Notification : triggers

    FinancialReport ..> Booking : uses
    FinancialReport ..> Expense : uses
```