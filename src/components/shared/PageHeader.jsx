import React from "react";

export default function PageHeader({ title, description, children }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-foreground tracking-tight">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {children && <div className="flex flex-col xs:flex-row items-stretch sm:items-start gap-2 sm:gap-3 sm:flex-nowrap">{children}</div>}
    </div>
  );
}
