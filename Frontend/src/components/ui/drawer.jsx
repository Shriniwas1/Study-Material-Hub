import * as React from "react"
import { Drawer as DrawerPrimitive } from "vaul"
import { cn } from "@/lib/utils"

export const Drawer = ({ shouldScaleBackground = true, ...props }) => (
  <DrawerPrimitive.Root shouldScaleBackground={shouldScaleBackground} {...props} />
)

export const DrawerTrigger = DrawerPrimitive.Trigger
export const DrawerPortal = DrawerPrimitive.Portal
export const DrawerClose = DrawerPrimitive.Close

export const DrawerOverlay = React.forwardRef(({ className, ...props }, ref) => (
  <DrawerPrimitive.Overlay
    ref={ref}
    className={cn("fixed inset-0 z-50 bg-black/80", className)}
    {...props} 
  />
))

export const DrawerContent = React.forwardRef(({ className, children, ...props }, ref) => (
  <DrawerPortal>
    <DrawerOverlay />
    <DrawerPrimitive.Content
      ref={ref}
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 mt-24 flex h-auto flex-col rounded-t-[10px] border bg-background",
        className
      )}
      {...props}
    >
      <div className="mx-auto mt-4 h-2 w-[100px] rounded-full bg-muted" />
      {children}
    </DrawerPrimitive.Content>
  </DrawerPortal>
))

export const DrawerHeader = ({ className, ...props }) => (
  <div className={cn("grid gap-1.5 p-4 text-center sm:text-left", className)} {...props} />
)

export const DrawerFooter = ({ className, ...props }) => (
  <div className={cn("mt-auto flex flex-col gap-2 p-4", className)} {...props} />
)

export const DrawerTitle = React.forwardRef(({ className, ...props }, ref) => (
  <DrawerPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight", className)}
    {...props} 
  />
))

export const DrawerDescription = React.forwardRef(({ className, ...props }, ref) => (
  <DrawerPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props} 
  />
))