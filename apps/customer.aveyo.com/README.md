# Aveyo Solar Customer App

The **Aveyo Solar Customer App** is a web application designed to provide customers with real-time updates on their solar panel installation process. Customers can use this app to track their project's progress, understand what stage they are in, and receive important notifications about the next steps.

This project is built with [Next.js](https://nextjs.org) and uses [Supabase](https://supabase.com) for authentication and data storage.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Features

- **Email-based Authentication**: Customers register and log in using their email address
- **Multi-project Support**: One email can be associated with multiple solar projects
- **Real-time Updates**: Project data is pulled from Supabase, which receives updates from an existing pipeline
- **Milestone Tracking**: A step-by-step timeline helps customers see what has been completed and what's pending
- **Document Access**: Users can download contracts, permits, and important files related to their solar system
- **Push & Email Notifications**: Customers are notified via in-app and email when project statuses change
- **Support & FAQs**: Provides an easy way for customers to get assistance or find answers to common questions

## Project Structure

- `src/app/(auth)`: Authentication routes (login, callback)
- `src/app/(dashboard)`: Protected routes for authenticated users
- `src/components`: Reusable UI components
- `src/lib`: Utility functions and services
- `src/types`: TypeScript type definitions

## Environment Variables

Create a `.env.local` file with the following variables:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_AUTH_APP_URL=https://auth-dev.aveyo.com
NEXT_PUBLIC_PLATFORM_API_BASE_URL=https://api-dev.aveyo.com
```

Platform auth migration notes are documented in `docs/platform-auth-migration-plan.md`.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
