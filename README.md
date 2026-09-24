This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

Create a `.env` file in the project root (or copy `.env.example`) and set your backend origin:

```dotenv
API_BASE_URL=http://localhost:8080
```

Replace the example with your backend URL, without `/api`. The frontend sends requests to `/api/*`, and Next.js proxies them to `API_BASE_URL/api/*`. This covers authentication, token refresh, dashboard data, and report downloads. The variable stays on the server and does not need a `NEXT_PUBLIC_` prefix.

Restart the development server after changing `.env`. For production, set `API_BASE_URL` before building, then rebuild and restart after changing it.

Then, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3001](http://localhost:3001) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

### Lecturer course ownership

The examination page loads `/api/exams/my-course-hierarchy` and provides school, programme, optional major, year/semester and course filters. Parent changes clear dependent filters; shared curriculum rows appear as a single course option. These filters choose courses only: allocation still uses the actual exam session from `/api/exams` and includes registrations across majors. The backend must have the V30 curriculum migration applied. Empty hierarchy data leaves the assigned exam list available.

After sign-in, the app loads assigned course codes, permitted exam sessions, and dashboard totals using the current access token. Course/exam data is held in memory within the signed-in account's UI and cleared on logout or account change. Exam detail state is scoped to the selected exam session; changing sessions discards the previous details and ignores late responses.

Venue allocation requires an explicit confirmation. It sends a bodyless POST with the exam session ID, disables controls while pending, and never automatically retries that POST. Successful allocation refreshes the details and dashboard. Ownership errors remove the inaccessible exam and refresh the shared selector; other backend error messages are displayed. Students are assigned to venues without numbered seats.

The lecturer report downloads one authenticated PDF containing attending students (PRESENT, LATE and WRONG_VENUE), recorded absences, and incidents across venues, with the backend-provided filename and UNZA branding. The report screen shows section counts and warns when the examination is not completed. Downloading does not create absence records; complete the examination using the existing end-examination process before downloading the final report.

Apply backend migration `V31__remove_seat_numbers.sql` after earlier migrations and legacy seeds before using the updated backend. Flyway is disabled, so restarting does not apply it. Database migrations and PDF generation are owned by the backend and are not executed by this frontend.

Run API regression checks with `node --test tests/api.test.mjs`, type checks with `npx tsc --noEmit`, and lint with `npm run lint`.

For live acceptance testing, apply the backend course-assignment scripts first (a backend restart alone does not seed assignments). Verify multiple assigned courses, multiple sessions of the same course, allocation success, ownership rejection, switching lecturer accounts, no assigned courses, and courses without exams. Backend seed scripts and account passwords are not included in this frontend repository.

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
