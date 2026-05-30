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
import { User, LogOut, Settings as SettingsIcon, Download } from 'lucide-react';
import { ProfileDialog } from './ProfileDialog';
import { SettingsDialog } from './SettingsDialog';
import { usePWA } from '@/hooks/usePWA';

interface ProfileMenuProps {
  onSettingsClick?: () => void;
}

export function ProfileMenu({ onSettingsClick }: ProfileMenuProps) {
  const { user, profile, signOut } = useAuth();
  const { isInstallable, installApp } = usePWA();
  const [showProfile, setShowProfile] = useState(false);

  if (!user) return null;

  const getInitials = (name?: string | null, email?: string | null) => {
    if (name) return name.substring(0, 2).toUpperCase();
    if (email) return email.substring(0, 2).toUpperCase();
    return 'U';
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-10 w-10 rounded-full">
            <Avatar className="h-10 w-10 transition-transform hover:scale-105 border-2 border-transparent hover:border-primary">
              <AvatarImage src={user.photoURL || undefined} alt={profile?.displayName || user.displayName || 'User'} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {getInitials(profile?.displayName || user.displayName, user.email)}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56 bg-white border border-slate-200" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none text-slate-800">{profile?.displayName || user.displayName || 'Welcome!'}</p>
              <p className="text-xs leading-none text-slate-400 font-semibold mt-0.5">
                {profile?.role ? profile.role.toUpperCase() : 'STUDENT'}
              </p>
              <p className="text-[10px] leading-none text-slate-400 truncate mt-0.5">
                {user.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-slate-100" />
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => setShowProfile(true)} className="cursor-pointer text-slate-600 hover:text-slate-900 focus:bg-slate-50">
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            {onSettingsClick && profile?.role === 'student' && (
              <DropdownMenuItem onClick={onSettingsClick} className="cursor-pointer text-slate-600 hover:text-slate-900 focus:bg-slate-50">
                <SettingsIcon className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
            )}
            {isInstallable && (
              <DropdownMenuItem onClick={installApp} className="cursor-pointer text-primary font-bold hover:text-primary focus:bg-primary/5">
                <Download className="mr-2 h-4 w-4" />
                <span>Install App</span>
              </DropdownMenuItem>
            )}
          </DropdownMenuGroup>
          <DropdownMenuSeparator className="bg-slate-100" />
          <DropdownMenuItem onClick={signOut} className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive font-semibold">
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ProfileDialog open={showProfile} onOpenChange={setShowProfile} />
    </>
  );
}
