
import React from 'react';
import { ArrowLeft, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';

const ProfileHeader: React.FC = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Signed out successfully",
        description: "You have been logged out",
      });
      navigate('/auth');
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: "Error",
        description: "Failed to sign out",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/">
            <ArrowLeft size={20} />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Your Profile</h1>
      </div>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleSignOut} 
        className="text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200"
      >
        <LogOut size={16} className="mr-2" />
        Sign Out
      </Button>
    </div>
  );
};

export default ProfileHeader;
