import { useNavigate } from "react-router-dom";

interface ProfileLinkProps {
  userId?: string;
  children: React.ReactNode;
  className?: string;
}

export const ProfileLink = ({ userId, children, className }: ProfileLinkProps) => {
  const navigate = useNavigate();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (userId) {
      navigate(`/profile/${userId}`);
    } else {
      navigate('/profile');
    }
  };

  return (
    <button onClick={handleClick} className={className}>
      {children}
    </button>
  );
};
