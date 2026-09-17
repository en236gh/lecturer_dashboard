# Next.js Best Practices: Architecture, Caching, & Optimization

This guide outlines engineering best practices for building scalable, high-performance web applications using **Next.js (App Router)**.

---

## 1. File Structuring & Architecture

Next.js uses a file-system based router. Structuring your `src/` directory cleanly prevents architecture degradation as the project expands.

### The Modular "Features" Structure
Instead of grouping files by technical type (e.g., keeping all components in one massive folder), group them by **domain feature**. This maintains high cohesion and low coupling.

```text
src/
├── app/                      # Core Routing Layer
│   ├── layout.tsx            # Global layout & providers
│   ├── page.tsx              # Homepage
│   ├── dashboard/            # Parent Route segment
│   │   ├── layout.tsx        # Dashboard-specific layout (Sidebar, Nav)
│   │   ├── page.tsx          # Dashboard main view
│   │   └── students/         # Nested Route segment
│   │       └── page.tsx      # Student management view
├── components/               # Global Shared UI Components
│   ├── ui/                   # Atomic primitives (Button, Input, Dialog)
│   └── feedback/             # Feedback primitives (Toast, Spinner)
├── features/                 # Domain-Driven Modules (Highly Recommended)
│   ├── lecturer-dashboard/   # Isolated feature module
│   │   ├── components/       # Feature-specific UI (RosterTable, PerformanceChart)
│   │   ├── actions.ts        # Scoped Server Actions
│   │   ├── types.ts          # TypeScript interfaces for this feature
│   │   └── utils.ts          # Pure functions for this feature
├── lib/                      # Global Configurations & SDK Clients
│   ├── db.ts                 # Database client (e.g., Prisma, Supabase)
│   └── utils.ts              # Global utilities (e.g., clsx/tailwind-merge)
└── styles/                   # Global style sheets
```

### Core Architecture Rules
* **Colocation:** Keep feature-specific components, hooks, and styles inside their respective `features/` directory rather than dumping them in a global folder.
* **Private Folders:** Use `_folderName` inside `src/app/` to opt out of routing if you must keep local UI components inside the routing layer.
* **Route Groups:** Use `(groupName)` to organize routes logically (e.g., `(auth)/login`, `(dashboard)/analytics`) without altering the URL path structure.

---

## 2. Data Caching & Revalidation

Next.js features an aggressive, multi-layered caching architecture designed to limit network requests and maximize speed. 

### The Four Caching Mechanisms
1. **Request Memoization:** Dedupes identical `fetch` requests (same URL and options) across a single React component tree render cycle.
2. **Data Cache:** Persists data across user requests and deployments.
3. **Full Route Cache:** Caches the HTML and Server Component payloads on the server at build time or during background revalidation.
4. **Router Cache:** Client-side cache that stores route segments in memory during the browser session.

### Implementation Patterns

#### A. Static Data Fetching (Cache Indefinitely)
Use for public data that rarely changes (e.g., course catalogs, landing page copy).
```typescript
// Cached by default across requests
const res = await fetch('https://api.example.com/courses');
const data = await res.json();
```

#### B. Time-Based Revalidation (ISR)
Use when data changes infrequently, and a slight delay in updates is acceptable (e.g., public blog posts, metrics updates).
```typescript
// Revalidate this data at most every hour (3600 seconds)
const res = await fetch('https://api.example.com/stats', {
  next: { revalidate: 3600 }
});
```

#### C. On-Demand Revalidation (Tag/Path Based)
Use when data must update instantly after an action occurs (e.g., clearing a cache when a teacher grades an assignment).
```typescript
// 1. Fetch data with a unique cache tag
const res = await fetch('https://api.example.com/roster', {
  next: { tags: ['students'] }
});

// 2. Clear cache inside a Server Action when mutation happens
'use server'
import { revalidateTag } from 'next/cache';

export async function addStudent(formData: FormData) {
  await db.insert(formData);
  revalidateTag('students'); // Purges cache instantly
}
```

#### D. Opting Out of Caching (Dynamic Fetching)
Use for user-specific configurations, live feeds, or transactional interfaces where stale data is breaking.
```typescript
// Force dynamic rendering and skip the Data Cache
const res = await fetch('https://api.example.com/profile', {
  cache: 'no-store'
});

// Alternative: Force an entire route file to be dynamic
export const dynamic = 'force-dynamic';
```

---

## 3. Performance & Asset Optimization

Maximizing Core Web Vitals (LCP, INP, CLS) requires leveraging built-in Next.js optimization wrappers.

### Image Optimization (`next/image`)
Never use standard HTML `<img>` tags. The `<Image />` component prevents Layout Shift (CLS) and resizes/compresses assets automatically.
* **Rule 1:** Always provide explicit `width` and `height` properties, OR use the `fill` property combined with a relative CSS parent container.
* **Rule 2:** Add the `priority` property to any image that constitutes the Largest Contentful Paint (LCP) above the fold.
```typescript
import Image from 'next/image';

export default function Hero() {
  return (
    <div className="relative w-full h-64">
      <Image 
        src="/hero.jpg" 
        alt="Dashboard Banner" 
        fill
        priority
        className="object-cover"
      />
    </div>
  );
}
```

### Font Optimization (`next/font`)
Next.js automatically downloads and hosts Google Fonts locally at build time. This ensures **zero layout shifts** and eliminates third-party network lookups.
```typescript
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap', // Prevents invisible text flash
});

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.className}>
      <body>{children}</body>
    </html>
  );
}
```

### Script & Core Profiling
* **External Scripts:** Load analytics or tracking scripts using `next/script` with a strategy parameter (`strategy="lazyOnload"` or `strategy="afterInteractive"`).
* **Bundle Analysis:** Run `@next/bundle-analyzer` periodically to discover massive third-party npm libraries dragging down bundle sizes.
* **Dynamic Imports:** Lazy-load large client components (like heavy data charts or text editors) using React's `lazy` or Next's `dynamic`.

---

## 4. State Management Strategy

In the App Router model, **the URL and Server Architecture represent your primary state manager.** Client-side state tools should be minimized and localized.

### The App Router State Pyramid

```text
▲ [SERVER STATE] Database & Data Cache (Source of Truth)
└── ▲ [ROUTER STATE] URL Search Params & Paths (Global Filter State)
    └── ▲ [CLIENT STATE] React Context / Zustand (Complex UI Interaction State)
        └── ▲ [LOCAL STATE] useState / useReducer (Atomic Component State)
```

### Best Practice Implementation Matrix

| State Type | Target Use Case | Recommended Tech Choice |
| :--- | :--- | :--- |
| **Server State** | Shared app data, tables, user accounts | React Server Components (RSC) + Server Actions |
| **Global UI/Filter State** | Pagination, search terms, drawer open/close tabs | URL Query Strings (`?page=2&search=john`) |
| **Complex Inter-Component** | Audio players, multi-step forms, themes | Zustand or React Context API |
| **Local Component State** | Form inputs, modal visibilities, drop-down toggles | Local React `useState` |

### Why the URL is Your Best Global State Manager
For dashboards, keep filters (search inputs, date ranges, pagination) in the URL using `useSearchParams`. 
* **Benefits:** Users can bookmark filtered tables, refresh pages without losing context, and easily share exact links with peers.
* **Implementation Pattern:**
```typescript
'use client'
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

export function SearchBar() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  function handleSearch(term: string) {
    const params = new URLSearchParams(searchParams);
    if (term) {
      params.set('query', term);
    } else {
      params.delete('query');
    }
    replace(`${pathname}?${params.toString()}`);
  }

  return <input onChange={(e) => handleSearch(e.target.value)} defaultValue={searchParams.get('query')?.toString()} />;
}
```