"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { api } from "@/lib/trpc/client"
import { useAuth } from "@/lib/auth/auth-context"

// Types for tRPC responses - matches the actual API response
type TRPCAuthResponse = {
  user: {
    id: string
    email: string
    name: string | null
    createdAt: string
  }
  token: string
}

const authSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  password: z.string().min(6, "Password must be at least 6 characters"),
})

type AuthFormData = z.infer<typeof authSchema>

interface AuthFormProps {
  mode: "login" | "register"
  onToggleMode: () => void
}

export function AuthForm({ mode, onToggleMode }: AuthFormProps) {
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()
  const { login } = useAuth()

  const form = useForm<AuthFormData>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      email: "",
      name: mode === "register" ? "" : undefined,
      password: "",
    },
  })

  // Reset form when mode changes
  useEffect(() => {
    form.reset({
      email: "",
      name: mode === "register" ? "" : undefined,
      password: "",
    })
  }, [mode, form])

  const registerMutation = api.auth.register.useMutation({
    onSuccess: (data: TRPCAuthResponse) => {
      toast.success(`Welcome ${data.user.name || 'User'}! Your account has been created.`)
      // Transform the data to match the User interface
      const user = {
        ...data.user,
        createdAt: new Date(data.user.createdAt)
      }
      login(user, data.token)
      router.push("/dashboard")
    },
    onError: (error: any) => {
      toast.error(error.message)
    },
  })

  const loginMutation = api.auth.login.useMutation({
    onSuccess: (data: TRPCAuthResponse) => {
      toast.success(`Welcome back, ${data.user.name || 'User'}!`)
      // Transform the data to match the User interface
      const user = {
        ...data.user,
        createdAt: new Date(data.user.createdAt)
      }
      login(user, data.token)
      router.push("/dashboard")
    },
    onError: (error: any) => {
      toast.error(error.message)
    },
  })

  const isLoading = registerMutation.isPending || loginMutation.isPending

  async function onSubmit(values: AuthFormData) {
    console.log("Form submitted:", { mode, values })
    try {
      if (mode === "register") {
        if (!values.name) {
          toast.error("Name is required for registration")
          return
        }
        console.log("Attempting registration...")
        await registerMutation.mutateAsync({
          email: values.email,
          name: values.name,
          password: values.password,
        })
      } else {
        console.log("Attempting login...")
        await loginMutation.mutateAsync({
          email: values.email,
          password: values.password,
        })
      }
    } catch (error) {
      console.error("Form submission error:", error)
      // Error handling is done in the mutation callbacks
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">
          {mode === "login" ? "Welcome Back" : "Create Account"}
        </CardTitle>
        <CardDescription className="text-center">
          {mode === "login"
            ? "Sign in to your budgeting account"
            : "Create your account to start budgeting together"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="Enter your email"
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {mode === "register" && (
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="Enter your full name"
                        disabled={isLoading}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        disabled={isLoading}
                        {...field}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={isLoading}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "login" ? "Sign In" : "Create Account"}
            </Button>
          </form>
        </Form>

        <Separator />

        <div className="text-center text-sm">
          <span className="text-muted-foreground">
            {mode === "login" ? "Don't have an account?" : "Already have an account?"}
          </span>{" "}
          <Button
            variant="link"
            className="p-0 h-auto font-normal"
            onClick={onToggleMode}
            disabled={isLoading}
          >
            {mode === "login" ? "Create one" : "Sign in"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
} 