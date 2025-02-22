# TeamNest Backend

TeamNest is a backend service designed to power the remote collaboration platform, handling user authentication, messaging, team, project, and task management.

## Features

- **User Authentication & Authorization**: Secure login and registration using Passport.js.
- **Real-time Messaging**: Supports direct and team-based communication.
- **User & Team Management**: Create and manage users and teams.
- **Project & Task Management**: Assign projects, create, update, and delete tasks.

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB
- **Authentication**: Passport.js with JWT
- **API Documentation**: Postman

## Getting Started

### Prerequisites

- Node.js & npm installed
- MongoDB instance running

### Installation

1. Clone the repository:
   ```sh
   git clone https://github.com/Ishu813/TeamNest-backend.git
   cd TeamNest-backend
   ```
2. Install dependencies:
   ```sh
   npm install
   ```
3. Create a `.env` file with the necessary configurations (DB connection, JWT secrets, etc.).
4. Start the server:
   ```sh
   node index.js
   ```

## API Endpoints

Refer to the API documentation in Postman for endpoint details.

## Contributing

Contributions are welcome! Open an issue for discussions.

## Additional Resources

Refer to the [frontend repository](https://github.com/Ishu813/TeamNest-frontend) for UI implementation.

