
import React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import { useChatStore } from "@/store";
import { 
  Settings, 
  LogOut, 
  Sparkles, 
  UserRound, 
  ChevronDown,
  Image
} from "lucide-react";
import UserComputeCredits from "./UserComputeCredits";
import { toast } from "sonner";

const UserMenu = () => {
  const { user } = useAuth();
  const { clearConversations } = useChatStore();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      toast.loading("Signing out...");
      await supabase.auth.signOut();
      clearConversations();
      navigate("/auth");
      toast.dismiss();
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("Error signing out. Please try again.");
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        className="hidden md:flex items-center gap-2"
        asChild
      >
        <Link to="/image-generation">
          <Image size={16} />
          <span>Generate Images</span>
        </Link>
      </Button>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-2"
          >
            <UserRound size={16} />
            <span className="hidden md:inline">
              {user?.email?.split("@")[0] || "User"}
            </span>
            <ChevronDown size={14} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="p-2">
            <p className="font-medium">{user?.email}</p>
            <UserComputeCredits />
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link to="/profile" className="flex cursor-pointer items-center">
              <Settings size={16} className="mr-2" />
              <span>Account Settings</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/upgrade" className="flex cursor-pointer items-center">
              <Sparkles size={16} className="mr-2" />
              <span>Upgrade Plan</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link to="/image-generation" className="flex cursor-pointer items-center md:hidden">
              <Image size={16} className="mr-2" />
              <span>Generate Images</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleSignOut}
            className="flex cursor-pointer items-center text-destructive focus:text-destructive"
          >
            <LogOut size={16} className="mr-2" />
            <span>Sign Out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default UserMenu;
