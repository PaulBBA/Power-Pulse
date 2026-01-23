import { useState } from "react";
import { useLocation, Redirect } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import logo from "@assets/generated_images/modern_abstract_teal_infinity_link_logo.png";
import { Lock, User, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const formSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export default function AuthPage() {
  const { user, loginMutation } = useAuth();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  if (user) {
    return <Redirect to="/" />;
  }

  function onSubmit(values: z.infer<typeof formSchema>) {
    loginMutation.mutate(values);
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background relative overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-50 via-background to-background dark:from-teal-900/10 dark:via-background dark:to-background"></div>
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md px-4 z-10">
        <div className="flex justify-center mb-8 text-center">
          <div className="flex flex-col items-center gap-3">
            <img src={logo} alt="BBA Energy" className="h-12 w-12 object-contain" />
            <h1 className="text-3xl font-bold tracking-tight text-foreground">BBA Energy</h1>
          </div>
        </div>

        <Card className="border-border/50 shadow-xl backdrop-blur-sm bg-card/95">
          <CardHeader className="space-y-1 pb-2 text-center">
            <CardTitle className="text-xl text-primary font-bold">Sign in to your account</CardTitle>
            <CardDescription>
              Welcome to the BBA Energy web reporting system. This system helps you to analyse your energy usage and help reduce costs.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input className="pl-9" placeholder="Enter your username" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input type="password" className="pl-9" placeholder="Enter your password" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="text-center text-sm text-muted-foreground pt-2 pb-2">
                  Please see your Energy Representative to obtain a log in.
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-11 text-base shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] bg-primary hover:bg-primary/90"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                  Sign Me In
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex flex-col gap-4 text-center text-sm text-muted-foreground border-t bg-muted/30 pt-4">
            <div className="flex justify-between w-full px-4">
              <span className="hover:text-primary cursor-pointer transition-colors">Reset password</span>
              <a href="#" className="hover:text-primary transition-colors">Terms of Use</a>
            </div>
          </CardFooter>
        </Card>
        
        <div className="mt-8 text-center text-xs text-muted-foreground">
          &copy; 2024 BBA Energy. All rights reserved.
        </div>
      </div>
    </div>
  );
}
