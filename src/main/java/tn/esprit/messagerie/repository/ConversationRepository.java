package tn.esprit.messagerie.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import tn.esprit.messagerie.Conversation;
import tn.esprit.messagerie.Message;

import java.util.List;

@Repository
public interface ConversationRepository extends JpaRepository<Conversation, Long> {

}