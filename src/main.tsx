import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import App from "./App";
import { ApiError } from "./lib/api/client";
import { BatchListRoute } from "./routes/BatchListRoute";
import { BatchProgressRoute } from "./routes/BatchProgressRoute";
import { IntakeRoute } from "./routes/IntakeRoute";
import { PublishedRoute } from "./routes/PublishedRoute";
import { ReviewRoute } from "./routes/ReviewRoute";
import "./styles.css";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // A 404 or a 422 will not become a 200 on the third try; only a network or server fault might.
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
          return false;
        }
        return failureCount < 2;
      },
      staleTime: 5_000,
      refetchOnWindowFocus: false,
    },
    mutations: {
      // Never. A retried approve or reject is a second decision recorded against one intention.
      retry: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<App />}>
            <Route index element={<Navigate to="/review" replace />} />
            <Route path="/intake" element={<IntakeRoute />} />
            <Route path="/batches" element={<BatchListRoute />} />
            <Route path="/batches/:batchId" element={<BatchProgressRoute />} />
            <Route path="/review" element={<ReviewRoute />} />
            {/* A candidate is addressable on its own, so a link to one survives a shared URL. */}
            <Route path="/review/:candidateId" element={<ReviewRoute />} />
            <Route path="/published" element={<PublishedRoute />} />
            <Route path="*" element={<Navigate to="/review" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
