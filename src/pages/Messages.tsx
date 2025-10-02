import { MessageCircle } from "lucide-react";

export const Messages = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 pb-20">
      <MessageCircle className="h-16 w-16 text-muted-foreground mb-4" />
      <h2 className="text-2xl font-bold mb-2">Messages</h2>
      <p className="text-muted-foreground text-center">
        Direct messaging feature coming soon!
      </p>
    </div>
  );
};
