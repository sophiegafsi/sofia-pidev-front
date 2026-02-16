package tn.esprit.messagerie.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import tn.esprit.messagerie.Message;
import tn.esprit.messagerie.DTO.MessageDTO;
import tn.esprit.messagerie.services.MessageService;

import java.util.List;

@RestController
@RequestMapping("/api/messages")
public class MessageController {

    @Autowired
    private MessageService messageService;

    @GetMapping
    public List<Message> getAllMessages() {
        return messageService.getAllMessages();
    }

    @GetMapping("/{id}")
    public Message getMessageById(@PathVariable Long id) {
        return messageService.getMessageById(id)
                .orElseThrow(() -> new RuntimeException("Message not found with id " + id));
    }

    @GetMapping("/conversation/{conversationId}")
    public List<Message> getMessagesByConversation(@PathVariable Long conversationId) {
        return messageService.getMessagesByConversation(conversationId);
    }

    @PostMapping
    public Message sendMessage(@RequestBody MessageDTO messageDTO) {
        Message message = new Message();

        message.setSenderId(messageDTO.getSenderId());
        message.setContent(messageDTO.getContent());
        message.setType(messageDTO.getType());

        // Copy attachment fields if present
        message.setAttachmentName(messageDTO.getAttachmentName());
        message.setAttachmentType(messageDTO.getAttachmentType());
        message.setAttachmentData(messageDTO.getAttachmentData());
        message.setAttachmentSize(messageDTO.getAttachmentSize());

        return messageService.sendMessage(message, messageDTO.getConversationId());
    }

    @PutMapping("/{id}")
    public Message updateMessage(@PathVariable Long id, @RequestBody MessageDTO messageDTO) {
        Message message = new Message();
        message.setContent(messageDTO.getContent());
        message.setType(messageDTO.getType());
        message.setIsRead(messageDTO.getIsRead());
        message.setIsDeleted(messageDTO.getIsDeleted());
        return messageService.updateMessage(id, message);
    }

    @DeleteMapping("/{id}")
    public String deleteMessage(@PathVariable Long id) {
        messageService.deleteMessage(id);
        return "Message deleted successfully";
    }
}
