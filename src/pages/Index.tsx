
import { useAuth } from "@/contexts/AuthContext";
import ChatContainer from "@/components/ChatContainer";

const Index = () => {
  // Access auth context to verify it's available
  const { user } = useAuth();
  
  return <ChatContainer />;
};

export default Index;
