import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { User } from '@supabase/supabase-js';

interface UserInfoProps {
  user: User;
  joinedDate: string;
}

const UserInfo: React.FC<UserInfoProps> = ({ user, joinedDate }) => {
  // Get user initials for avatar fallback
  const getUserInitials = () => {
    if (!user) return '?';
    
    const name = user.user_metadata?.name || user.email || '';
    if (!name) return '?';
    
    // If it's an email and no name is available, use first letter of email
    if (name.includes('@') && !user.user_metadata?.name) {
      return name.charAt(0).toUpperCase();
    }
    
    // Otherwise get initials from name
    return name
      .split(' ')
      .map(n => n.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');
  };

  return (
    <Card className="md:col-span-1">
      <CardHeader className="flex flex-row items-start space-x-4 pb-2">
        <Avatar className="h-16 w-16 flex-shrink-0">
          <AvatarImage src={user.user_metadata?.avatar_url} />
          <AvatarFallback className="text-xl">{getUserInitials()}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <CardTitle className="text-xl text-wrap break-words leading-tight mb-1">
            {user.user_metadata?.name || 'User'}
          </CardTitle>
          <CardDescription className="text-wrap break-words text-sm">
            {user.email}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <p className="text-sm text-muted-foreground">
          Member since <span className="font-medium">{joinedDate}</span>
        </p>
      </CardContent>
    </Card>
  );
};

export default UserInfo;
