// src/app/page.tsx

"use client"; // <-- 1. Add this for onClick interactivity

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toast } from "sonner"; // <-- 2. Import toast from sonner
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"; // <-- 3. Import Card components
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // <-- 4. Import Alert
import { Terminal } from "lucide-react"; // <-- 5. Import an icon
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"; // <-- 6. Import Tooltip

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        {/* --- ADDED TOOLTIP --- */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Image
                className="dark:invert"
                src="/next.svg"
                alt="Next.js logo"
                width={100}
                height={20}
                priority
              />
            </TooltipTrigger>
            <TooltipContent>
              <p>The React Framework for Production</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          {/* --- ADDED ALERT --- */}
          <Alert>
            <Terminal className="h-4 w-4" />
            <AlertTitle>Heads up!</AlertTitle>
            <AlertDescription>
              All shadcn/ui components were successfully installed.
            </AlertDescription>
          </Alert>

          {/* --- ADDED CARD --- */}
          <Card className="w-full">
            <CardHeader>
              <CardTitle>To get started, edit this page.</CardTitle>
              <CardDescription>File: src/app/page.tsx</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
                Looking for a starting point? Head over to{" "}
                <a
                  href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
                  className="font-medium text-zinc-950 underline-offset-4 hover:underline dark:text-zinc-50"
                >
                  Templates
                </a>{" "}
                or the{" "}
                <a
                  href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
                  className="font-medium text-zinc-950 underline-offset-4 hover:underline dark:text-zinc-50"
                >
                  Learning
                </a>{" "}
                center.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">
          <Button asChild className="h-12 w-full md:w-auto">
            <Link
              href="https://vercel.com/new?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Image
                className="mr-2 dark:invert"
                src="/vercel.svg"
                alt="Vercel logomark"
                width={16}
                height={16}
              />
              Deploy Now
            </Link>
          </Button>

          <Button asChild variant="outline" className="h-12 w-full md:w-auto">
            <Link
              href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
              target="_blank"
              rel="noopener noreferrer"
            >
              Documentation
            </Link>
          </Button>

          {/* --- ADDED TOAST BUTTON --- */}
          <Button
            variant="secondary"
            className="h-12 w-full md:w-auto"
            onClick={() =>
              toast.success("It works!", {
                description: "This toast notification comes from <Toaster />.",
              })
            }
          >
            Show Toast
          </Button>
        </div>
      </main>
    </div>
  );
}
