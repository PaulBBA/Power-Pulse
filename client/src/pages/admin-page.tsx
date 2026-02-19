import { Layout } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, MoreHorizontal, Shield, ShieldAlert, User as UserIcon, Loader2, Trash2, CheckCircle2, Circle, Eye, Pencil } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User, insertUserSchema, TodoItem, Group } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type SafeUser = Omit<User, 'password'>;

function getRoleIcon(role: string) {
  if (role === "admin") return <ShieldAlert className="h-4 w-4 text-destructive" />;
  if (role === "editor") return <Pencil className="h-4 w-4 text-primary" />;
  return <Eye className="h-4 w-4 text-muted-foreground" />;
}

function getRoleBadgeVariant(role: string): "destructive" | "default" | "secondary" {
  if (role === "admin") return "destructive";
  if (role === "editor") return "default";
  return "secondary";
}

export default function AdminPage() {
  const [search, setSearch] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SafeUser | null>(null);
  const [groupsDialogUser, setGroupsDialogUser] = useState<SafeUser | null>(null);
  const [deleteUser, setDeleteUser] = useState<SafeUser | null>(null);
  const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>([]);
  const [groupSearch, setGroupSearch] = useState("");
  const [newTodoText, setNewTodoText] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: usersData, isLoading } = useQuery<SafeUser[]>({
    queryKey: ["/api/admin/users"],
  });

  const { data: allGroups } = useQuery<Group[]>({
    queryKey: ["/api/groups/all"],
  });

  const { data: todoItems, isLoading: todosLoading } = useQuery<TodoItem[]>({
    queryKey: ["/api/todos"],
  });

  const form = useForm({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      username: "",
      password: "",
      role: "viewer",
    },
  });

  const editForm = useForm({
    defaultValues: {
      username: "",
      role: "viewer",
      password: "",
    },
  });

  useEffect(() => {
    if (editingUser) {
      editForm.reset({
        username: editingUser.username,
        role: editingUser.role,
        password: "",
      });
    }
  }, [editingUser]);

  const createUserMutation = useMutation({
    mutationFn: async (values: any) => {
      const res = await apiRequest("POST", "/api/admin/users", values);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Success", description: "User created successfully" });
      setIsCreateDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create user", variant: "destructive" });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Success", description: "User updated successfully" });
      setEditingUser(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update user", variant: "destructive" });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/admin/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Success", description: "User deleted" });
      setDeleteUser(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete user", variant: "destructive" });
    },
  });

  const saveGroupsMutation = useMutation({
    mutationFn: async ({ userId, groupIds }: { userId: number; groupIds: number[] }) => {
      const res = await apiRequest("PUT", `/api/admin/users/${userId}/groups`, { groupIds });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Success", description: "Group assignments updated" });
      setGroupsDialogUser(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update groups", variant: "destructive" });
    },
  });

  const createTodoMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await apiRequest("POST", "/api/todos", { text, isDone: false });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/todos"] });
      setNewTodoText("");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to add item", variant: "destructive" });
    },
  });

  const toggleTodoMutation = useMutation({
    mutationFn: async ({ id, isDone }: { id: number; isDone: boolean }) => {
      const res = await apiRequest("PATCH", `/api/todos/${id}`, { isDone });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/todos"] });
    },
  });

  const deleteTodoMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/todos/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/todos"] });
    },
  });

  const handleAddTodo = () => {
    const trimmed = newTodoText.trim();
    if (!trimmed) return;
    createTodoMutation.mutate(trimmed);
  };

  const handleOpenGroupsDialog = async (user: SafeUser) => {
    setGroupsDialogUser(user);
    setGroupSearch("");
    try {
      const res = await apiRequest("GET", `/api/admin/users/${user.id}/groups`);
      const ids = await res.json();
      setSelectedGroupIds(ids);
    } catch {
      setSelectedGroupIds([]);
    }
  };

  const handleEditUser = (data: any) => {
    if (!editingUser) return;
    const updateData: any = { role: data.role, username: data.username };
    if (data.password && data.password.trim()) {
      updateData.password = data.password;
    }
    updateUserMutation.mutate({ id: editingUser.id, data: updateData });
  };

  const filteredUsers = usersData?.filter(user => 
    user.username.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const filteredGroups = allGroups?.filter(g =>
    g.name.toLowerCase().includes(groupSearch.toLowerCase())
  ).sort((a, b) => a.name.localeCompare(b.name)) || [];

  const pendingTodos = todoItems?.filter(t => !t.isDone) || [];
  const doneTodos = todoItems?.filter(t => t.isDone) || [];

  return (
    <Layout>
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">Administration</h1>
        <p className="text-muted-foreground">Manage users, roles, group access, and system settings.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div className="space-y-1">
              <CardTitle>Users</CardTitle>
              <CardDescription>Manage user access and roles. Assign groups to control data visibility.</CardDescription>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-user">
                  <Plus className="mr-2 h-4 w-4" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New User</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit((data) => createUserMutation.mutate(data))} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl><Input {...field} data-testid="input-username" /></FormControl>
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
                          <FormControl><Input type="password" {...field} data-testid="input-password" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Role</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-role">
                                <SelectValue placeholder="Select a role" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="viewer">Viewer (Read Only)</SelectItem>
                              <SelectItem value="editor">Editor (Edit Sites & Meters)</SelectItem>
                              <SelectItem value="admin">Admin (Full Access)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full" disabled={createUserMutation.isPending} data-testid="button-save-user">
                      {createUserMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save User
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  type="search" 
                  placeholder="Search users..." 
                  className="pl-9" 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  data-testid="input-search-users"
                />
              </div>
            </div>

            <div className="text-xs text-muted-foreground mb-3 flex gap-4">
              <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> Viewer = Read only</span>
              <span className="flex items-center gap-1"><Pencil className="h-3 w-3" /> Editor = Edit sites & meters</span>
              <span className="flex items-center gap-1"><ShieldAlert className="h-3 w-3" /> Admin = Full access</span>
            </div>

            <div className="rounded-md border overflow-hidden">
              {isLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map((user) => (
                        <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold">
                                {user.username[0].toUpperCase()}
                              </div>
                              <div>
                                <div className="font-medium">{user.username}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getRoleBadgeVariant(user.role)}>
                              <span className="flex items-center gap-1">
                                {getRoleIcon(user.role)}
                                <span className="capitalize">{user.role}</span>
                              </span>
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0" data-testid={`button-user-menu-${user.id}`}>
                                  <span className="sr-only">Open menu</span>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => setEditingUser(user)} data-testid={`button-edit-user-${user.id}`}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Edit user
                                </DropdownMenuItem>
                                {user.role !== "admin" && (
                                  <DropdownMenuItem onClick={() => handleOpenGroupsDialog(user)} data-testid={`button-assign-groups-${user.id}`}>
                                    <Shield className="mr-2 h-4 w-4" />
                                    Assign groups
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => setDeleteUser(user)}
                                  data-testid={`button-delete-user-${user.id}`}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete user
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">No users found</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-4">
            <div className="space-y-1">
              <CardTitle>To Do List</CardTitle>
              <CardDescription>Keep track of ideas and planned changes.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-6">
              <Input
                placeholder="Add a new idea or task..."
                value={newTodoText}
                onChange={(e) => setNewTodoText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleAddTodo(); }}
                data-testid="input-new-todo"
              />
              <Button
                onClick={handleAddTodo}
                disabled={!newTodoText.trim() || createTodoMutation.isPending}
                data-testid="button-add-todo"
              >
                {createTodoMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </Button>
            </div>

            {todosLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-1">
                {pendingTodos.length === 0 && doneTodos.length === 0 && (
                  <p className="text-center py-8 text-muted-foreground text-sm">No items yet. Add your first idea above.</p>
                )}

                {pendingTodos.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-2 rounded-md hover:bg-secondary/50 group"
                    data-testid={`todo-item-${item.id}`}
                  >
                    <button
                      onClick={() => toggleTodoMutation.mutate({ id: item.id, isDone: true })}
                      className="text-muted-foreground hover:text-primary shrink-0"
                      data-testid={`button-toggle-${item.id}`}
                    >
                      <Circle className="h-5 w-5" />
                    </button>
                    <span className="flex-1 text-sm">{item.text}</span>
                    <button
                      onClick={() => deleteTodoMutation.mutate(item.id)}
                      className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      data-testid={`button-delete-${item.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}

                {doneTodos.length > 0 && pendingTodos.length > 0 && (
                  <div className="border-t my-3" />
                )}

                {doneTodos.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-2 rounded-md hover:bg-secondary/50 group"
                    data-testid={`todo-item-${item.id}`}
                  >
                    <button
                      onClick={() => toggleTodoMutation.mutate({ id: item.id, isDone: false })}
                      className="text-primary shrink-0"
                      data-testid={`button-toggle-${item.id}`}
                    >
                      <CheckCircle2 className="h-5 w-5" />
                    </button>
                    <span className="flex-1 text-sm line-through text-muted-foreground">{item.text}</span>
                    <button
                      onClick={() => deleteTodoMutation.mutate(item.id)}
                      className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      data-testid={`button-delete-${item.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => { if (!open) setEditingUser(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User: {editingUser?.username}</DialogTitle>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit(handleEditUser)} className="space-y-4">
            <div className="space-y-2">
              <Label>Username</Label>
              <Input {...editForm.register("username")} data-testid="input-edit-username" />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={editForm.watch("role")}
                onValueChange={(val) => editForm.setValue("role", val)}
              >
                <SelectTrigger data-testid="select-edit-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">Viewer (Read Only)</SelectItem>
                  <SelectItem value="editor">Editor (Edit Sites & Meters)</SelectItem>
                  <SelectItem value="admin">Admin (Full Access)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>New Password (leave blank to keep current)</Label>
              <Input type="password" {...editForm.register("password")} data-testid="input-edit-password" />
            </div>
            <Button type="submit" className="w-full" disabled={updateUserMutation.isPending} data-testid="button-update-user">
              {updateUserMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update User
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign Groups Dialog */}
      <Dialog open={!!groupsDialogUser} onOpenChange={(open) => { if (!open) setGroupsDialogUser(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Assign Groups: {groupsDialogUser?.username}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Select which groups this user can access. They will see all sites and meters within their assigned groups.
          </p>
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search groups..."
              className="pl-9"
              value={groupSearch}
              onChange={(e) => setGroupSearch(e.target.value)}
              data-testid="input-search-groups"
            />
          </div>
          <div className="flex gap-2 mb-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedGroupIds(allGroups?.map(g => g.id) || [])}
              data-testid="button-select-all-groups"
            >
              Select All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedGroupIds([])}
              data-testid="button-deselect-all-groups"
            >
              Deselect All
            </Button>
            <span className="text-sm text-muted-foreground ml-auto self-center">
              {selectedGroupIds.length} of {allGroups?.length || 0} selected
            </span>
          </div>
          <ScrollArea className="h-[300px] border rounded-md p-2">
            <div className="space-y-1">
              {filteredGroups.map((group) => (
                <label
                  key={group.id}
                  className="flex items-center gap-3 p-2 rounded-md hover:bg-secondary/50 cursor-pointer"
                  data-testid={`group-checkbox-${group.id}`}
                >
                  <Checkbox
                    checked={selectedGroupIds.includes(group.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedGroupIds(prev => [...prev, group.id]);
                      } else {
                        setSelectedGroupIds(prev => prev.filter(id => id !== group.id));
                      }
                    }}
                  />
                  <span className="text-sm">{group.name}</span>
                </label>
              ))}
              {filteredGroups.length === 0 && (
                <p className="text-center py-4 text-muted-foreground text-sm">No groups found</p>
              )}
            </div>
          </ScrollArea>
          <Button
            onClick={() => {
              if (groupsDialogUser) {
                saveGroupsMutation.mutate({ userId: groupsDialogUser.id, groupIds: selectedGroupIds });
              }
            }}
            disabled={saveGroupsMutation.isPending}
            className="w-full"
            data-testid="button-save-groups"
          >
            {saveGroupsMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Group Assignments
          </Button>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteUser} onOpenChange={(open) => { if (!open) setDeleteUser(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteUser?.username}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteUser && deleteUserMutation.mutate(deleteUser.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
