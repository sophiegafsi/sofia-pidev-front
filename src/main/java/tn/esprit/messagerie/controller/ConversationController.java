package tn.esprit.messagerie.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import tn.esprit.messagerie.Conversation;
import tn.esprit.messagerie.services.ConversationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

import java.util.List;

@RestController
@RequestMapping("/api/conversations")
@Tag(name = "Conversations", description = "API for managing conversations")
public class ConversationController {

    @Autowired
    private ConversationService conversationService;

    @GetMapping
    @Operation(summary = "Get all conversations", description = "Retrieve a list of all conversations")
    public List<Conversation> getAllConversations() {
        return conversationService.getAllConversations();
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get conversation by ID", description = "Retrieve a single conversation by its ID")
    public Conversation getConversationById(@PathVariable Long id) {
        return conversationService.getConversationById(id)
                .orElseThrow(() -> new RuntimeException("Conversation not found with id " + id));
    }

    @PostMapping
    @Operation(summary = "Create conversation", description = "Create a new conversation")
    public Conversation createConversation(@RequestBody Conversation conversation) {
        return conversationService.createConversation(conversation);
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update conversation", description = "Update an existing conversation by ID")
    public Conversation updateConversation(@PathVariable Long id, @RequestBody Conversation updatedConversation) {
        return conversationService.updateConversation(id, updatedConversation);
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete conversation", description = "Delete a conversation by ID")
    public String deleteConversation(@PathVariable Long id) {
        conversationService.deleteConversation(id);
        return "Conversation deleted successfully";
    }
}
