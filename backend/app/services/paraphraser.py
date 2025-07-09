from transformers import MT5Tokenizer, MT5ForConditionalGeneration
from functools import lru_cache

# Checkpoint for the Vietnamese paraphrase model
CKPT = 'chieunq/vietnamese-sentence-paraphase'

class Paraphraser:
    """
    Service for paraphrasing Vietnamese sign language detections into complete sentences
    using an MT5 model fine-tuned for Vietnamese paraphrasing.
    """
    
    def __init__(self):
        """Initialize the paraphraser with MT5 model and context tracking"""
        self.tokenizer = MT5Tokenizer.from_pretrained(CKPT, legacy=True)
        self.model = MT5ForConditionalGeneration.from_pretrained(CKPT)
        print("[Paraphraser] Vietnamese MT5 paraphrase model loaded successfully")
       
    def paraphrase(self, text: str) -> str:
        """
        Paraphrase the input text into a more complete sentence
        
        Args:
            text: Input text to paraphrase
            
        Returns:
            Paraphrased text as a complete sentence
        """
        if len(text.split()) <= 2:
            return text
            
        # Tokenize input text
        inputs = self.tokenizer(text, padding='longest', max_length=16, return_tensors='pt')
        input_ids = inputs.input_ids
        attention_mask = inputs.attention_mask
        output = self.model.generate(input_ids, attention_mask=attention_mask, max_length=16)
        return self.tokenizer.decode(output[0], skip_special_tokens=True)

@lru_cache
def get_paraphraser():
    """
    Get (or create) a paraphraser instance (singleton pattern)
    
    Returns:
        Paraphraser instance
    """
    return Paraphraser()