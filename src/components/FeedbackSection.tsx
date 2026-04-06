import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle2, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function FeedbackSection() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState("feedback");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    console.log("[Feedback]", { name, email, category, message });
    setSubmitted(true);
  };

  return (
    <section className="py-16 md:py-20 bg-muted/30">
      <div className="container mx-auto px-4 max-w-xl">
        <AnimatePresence mode="wait">
          {submitted ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-12"
            >
              <CheckCircle2 className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">Thank you!</h3>
              <p className="text-muted-foreground">Your feedback helps us improve ListenFlow.</p>
            </motion.div>
          ) : (
            <motion.div key="form" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
              <h2 className="text-2xl font-bold text-foreground text-center mb-2">
                Help shape ListenFlow
              </h2>
              <p className="text-muted-foreground text-center mb-8">
                Share a suggestion, report a bug, or request a feature.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    placeholder="Name (optional)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={100}
                  />
                  <Input
                    type="email"
                    placeholder="Email (optional)"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    maxLength={255}
                  />
                </div>

                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="feedback">Feedback</SelectItem>
                    <SelectItem value="bug">Bug report</SelectItem>
                    <SelectItem value="feature">Feature request</SelectItem>
                  </SelectContent>
                </Select>

                <Textarea
                  placeholder="Your message *"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={2000}
                  className="min-h-[120px]"
                  required
                />

                <Button
                  type="submit"
                  disabled={!message.trim()}
                  className="w-full"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send feedback
                </Button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
