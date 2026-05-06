import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { User, LogOut, Settings as SettingsIcon, Palette, Download } from 'lucide-react';
import { ProfileDialog } from './ProfileDialog';
import { SettingsDialog } from './SettingsDialog';
import { useTheme } from 'next-themes';
import { usePWA } from '@/hooks/usePWA';

interface ProfileMenuProps {
  onSettingsClick?: () => void;
}

export function ProfileMenu({ onSettingsClick }: ProfileMenuProps) {
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const { isInstallable, installApp } = usePWA();
  const [showProfile, setShowProfile] = useState(false);

  if (!user) return null;

  const getInitials = (name?: string | null, email?: string | null) => {
    if (name) return name.substring(0, 2).toUpperCase();
    if (email) return email.substring(0, 2).toUpperCase();
    return 'U';
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-10 w-10 rounded-full">
            <Avatar className="h-10 w-10 transition-transform hover:scale-105 border-2 border-transparent hover:border-primary">
              <AvatarImage src={user.photoURL || undefined} alt={user.displayName || 'User'} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {getInitials(user.displayName, user.email)}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{user.displayName || 'Welcome!'}</p>
              <p className="text-xs leading-none text-muted-foreground">
                {user.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => setShowProfile(true)} className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            {onSettingsClick && (
              <DropdownMenuItem onClick={onSettingsClick} className="cursor-pointer">
                <SettingsIcon className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={toggleTheme} className="cursor-pointer">
              <Palette className="mr-2 h-4 w-4" />
              <span>Toggle Theme</span>
            </DropdownMenuItem>
            {isInstallable && (
              <DropdownMenuItem onClick={installApp} className="cursor-pointer text-primary font-bold">
                <Download className="mr-2 h-4 w-4" />
                <span>Install App</span>
              </DropdownMenuItem>
            )}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={signOut} className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive">
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ProfileDialog open={showProfile} onOpenChange={setShowProfile} />
    </>
  );
}
