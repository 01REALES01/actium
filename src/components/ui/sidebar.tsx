import * as React from "react";
import { cn } from "@/lib/utils";

const Sidebar = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(({ className, ...props }, ref) => (
  <aside
    ref={ref}
    className={cn(
      "flex h-screen w-64 flex-col border-r border-[--border-subtle] bg-[--bg-secondary] text-[--text-primary]",
      className,
    )}
    {...props}
  />
));
Sidebar.displayName = "Sidebar";

const SidebarHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex h-16 items-center px-5", className)} {...props} />
);
SidebarHeader.displayName = "SidebarHeader";

const SidebarContent = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex-1 px-3 py-4", className)} {...props} />
);
SidebarContent.displayName = "SidebarContent";

const SidebarFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("border-t border-[--border-subtle] p-4", className)} {...props} />
);
SidebarFooter.displayName = "SidebarFooter";

const SidebarNav = ({ className, ...props }: React.HTMLAttributes<HTMLElement>) => (
  <nav className={cn("space-y-1", className)} {...props} />
);
SidebarNav.displayName = "SidebarNav";

export { Sidebar, SidebarHeader, SidebarContent, SidebarFooter, SidebarNav };
