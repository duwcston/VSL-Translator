from transformers import MT5Tokenizer, MT5ForConditionalGeneration
from functools import lru_cache

CKPT = 'chieunq/vietnamese-sentence-paraphase'

class Paraphraser:
    def __init__(self):
        self.tokenizer = MT5Tokenizer.from_pretrained(CKPT, legacy=True)
        self.model = MT5ForConditionalGeneration.from_pretrained(CKPT)
        print("Vietnamese MT5 paraphrase model loaded successfully")
       
    def paraphrase(self, text: str) -> str:
        if len(text.split()) <= 2:
            return text
            
        inputs = self.tokenizer(text, padding='longest', max_length=16, return_tensors='pt')
        input_ids = inputs.input_ids
        attention_mask = inputs.attention_mask
        output = self.model.generate(input_ids, attention_mask=attention_mask, max_length=16)
        return self.tokenizer.decode(output[0], skip_special_tokens=True)

@lru_cache
def get_paraphraser():
    return Paraphraser()