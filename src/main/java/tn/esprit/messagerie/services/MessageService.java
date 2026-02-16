package tn.esprit.messagerie.services;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import tn.esprit.messagerie.Message;
import tn.esprit.messagerie.Conversation;
import tn.esprit.messagerie.repository.MessageRepository;
import tn.esprit.messagerie.repository.ConversationRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class MessageService {

    @Autowired
    private MessageRepository messageRepository;

    @Autowired
    private ConversationRepository conversationRepository;

    public List<Message> getAllMessages() {
        return messageRepository.findAll();
    }

    public Optional<Message> getMessageById(Long id) {
        return messageRepository.findById(id);
    }

    public List<Message> getMessagesByConversation(Long conversationId) {
        return messageRepository.findByConversationIdOrderBySentAtAsc(conversationId);
    }

    public Message sendMessage(Message message, Long conversationId) {
        Conversation conversation = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new RuntimeException("Conversation not found"));

        message.setConversation(conversation);
        message.setSentAt(LocalDateTime.now());
        message.setIsRead(false);
        message.setIsDeleted(false);

        conversation.setLastMessageAt(LocalDateTime.now());
        conversationRepository.save(conversation);

        return messageRepository.save(message);
    }

    public Message updateMessage(Long id, Message messageDetails) {
        Message message = messageRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Message not found with id " + id));

        message.setContent(messageDetails.getContent());
        message.setType(messageDetails.getType());
        message.setIsRead(messageDetails.getIsRead());
        message.setIsDeleted(messageDetails.getIsDeleted());

        return messageRepository.save(message);
    }

    public void deleteMessage(Long id) {
        Message message = messageRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Message not found with id " + id));
        messageRepository.delete(message);
    }
}
