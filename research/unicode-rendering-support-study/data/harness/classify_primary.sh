#!/bin/bash
cd "$(dirname "$0")"
for c in A_stock A_minimal A_distro B_noto; do
  python3 classify.py ${c}__codepoints__c155 ${c}__components__c155 ${c}__utgcp__c155 ${c}__vs__c155 ${c}__emojicp__c155 ${c}__sequences__c155 ${c}__utgseq__c155 2>&1 | grep -v -i warn | sed 's#/home/user/.*classified/##'
done
