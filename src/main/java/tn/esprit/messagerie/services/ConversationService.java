package tn.esprit.messagerie.services;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import tn.esprit.messagerie.Conversation;
import tn.esprit.messagerie.repository.ConversationRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class ConversationService {

    @Autowired
    private ConversationRepository conversationRepository;

    public List<Conversation> getAllConversations() {
        return conversationRepository.findAll();
    }

    public Optional<Conversation> getConversationById(Long id) {
        return conversationRepository.findById(id);
    }

    public Conversation createConversation(Conversation conversation) {
        conversation.setCreatedAt(LocalDateTime.now());
        conversation.setLastMessageAt(LocalDateTime.now());
        conversation.setIsArchived(false);
        conversation.setIsDeleted(false);
        return conversationRepository.save(conversation);
    }

    public Conversation updateConversation(Long id, Conversation updatedConversation) {
        Conversation conversation = conversationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Conversation not found with id " + id));

        conversation.setTitle(updatedConversation.getTitle());
        conversation.setStatus(updatedConversation.getStatus());
        conversation.setIsArchived(updatedConversation.getIsArchived());
        conversation.setIsDeleted(updatedConversation.getIsDeleted());
        conversation.setClientId(updatedConversation.getClientId());
        conversation.setFreelancerId(updatedConversation.getFreelancerId());
        conversation.setProjectId(updatedConversation.getProjectId());

        return conversationRepository.save(conversation);
    }

    public void deleteConversation(Long id) {
        Conversation conversation = conversationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Conversation not found with id " + id));
        conversationRepository.delete(conversation);
    }
}
