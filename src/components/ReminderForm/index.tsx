import { useEffect, useMemo, useState } from "react";
import { Picker, Text, View } from "@tarojs/components";
import type {
  BaseEventOrig,
  PickerDateProps,
  PickerSelectorProps,
  PickerTimeProps,
} from "@tarojs/components";
import Taro from "@tarojs/taro";
import { Button, Input, Textarea } from "@taroify/core";

import {
  INTERVAL_OPTIONS,
  BEFORE_OPTIONS,
  DEFAULT_BEFORE,
  DEFAULT_INTERVAL,
  DEFAULT_REMIND_TIME,
  REMINDER_STATUS,
} from "@/constants";
import { useDerivedById, useReminderActions } from "@/hooks/useReminders";
import { calcNextDate, calcRemindDate, today } from "@/utils/dateUtils";
import { loadSettings } from "@/utils/storage";

import "./index.scss";

interface ReminderFormProps {
  reminderId?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

interface FormValues {
  medicineName: string;
  medicineSpec: string;
  currentPrescriptionDate: string;
  remindTime: string;
  intervalDays: number;
  remindAdvanceDays: number;
  note: string;
}

function makeDefaults(): FormValues {
  const settings = loadSettings();

  return {
    medicineName: "",
    medicineSpec: "",
    currentPrescriptionDate: today(),
    remindTime: settings.defaultTime || DEFAULT_REMIND_TIME,
    intervalDays: DEFAULT_INTERVAL,
    remindAdvanceDays: settings.defaultBefore || DEFAULT_BEFORE,
    note: "",
  };
}

type InputEvent = BaseEventOrig<{ value: string }>;
type TextareaEvent = BaseEventOrig<{ value: string }>;
type DatePickerEvent = BaseEventOrig<PickerDateProps.ChangeEventDetail>;
type SelectorPickerEvent = BaseEventOrig<PickerSelectorProps.ChangeEventDetail>;
type TimePickerEvent = BaseEventOrig<PickerTimeProps.ChangeEventDetail>;

export default function ReminderForm({
  reminderId,
  onSuccess,
  onCancel,
}: ReminderFormProps) {
  void onCancel;
  const isEdit = Boolean(reminderId);
  const existingItem = useDerivedById(reminderId ?? "");
  const { addReminder, updateReminder } = useReminderActions();

  const [values, setValues] = useState<FormValues>(makeDefaults);

  useEffect(() => {
    if (isEdit && existingItem) {
      setValues({
        medicineName: existingItem.medicineName,
        medicineSpec: existingItem.medicineSpec,
        currentPrescriptionDate: existingItem.currentPrescriptionDate,
        remindTime: existingItem.remindTime,
        intervalDays: existingItem.intervalDays,
        remindAdvanceDays: existingItem.remindAdvanceDays,
        note: existingItem.note,
      });
      return;
    }

    if (!isEdit) {
      setValues(makeDefaults());
    }
  }, [existingItem, isEdit]);

  const calcText = useMemo(() => {
    const nextDate = calcNextDate(
      values.currentPrescriptionDate,
      values.intervalDays,
    );
    const remindDate = calcRemindDate(nextDate, values.remindAdvanceDays);
    return `预计下次开药日期为 ${nextDate}，提醒时间为 ${remindDate} ${values.remindTime}`;
  }, [
    values.remindAdvanceDays,
    values.intervalDays,
    values.currentPrescriptionDate,
    values.remindTime,
  ]);

  const intervalIndex = useMemo(
    () =>
      Math.max(
        0,
        INTERVAL_OPTIONS.findIndex((value) => value === values.intervalDays),
      ),
    [values.intervalDays],
  );

  const beforeIndex = useMemo(
    () =>
      Math.max(
        0,
        BEFORE_OPTIONS.findIndex((value) => value === values.remindAdvanceDays),
      ),
    [values.remindAdvanceDays],
  );

  const setField = (field: keyof FormValues, value: string | number) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!values.medicineName.trim()) {
      Taro.showToast({ title: "请填写药物名称", icon: "none", duration: 1500 });
      return;
    }

    if (values.intervalDays < 1 || values.intervalDays > 365) {
      Taro.showToast({
        title: "间隔天数需在 1-365 之间",
        icon: "none",
        duration: 1500,
      });
      return;
    }

    const payload = {
      medicineName: values.medicineName.trim(),
      medicineSpec: values.medicineSpec.trim(),
      currentPrescriptionDate: values.currentPrescriptionDate,
      remindTime: values.remindTime,
      intervalDays: values.intervalDays,
      remindAdvanceDays: values.remindAdvanceDays,
      note: values.note.trim(),
    };

    try {
      if (isEdit && reminderId) {
        await updateReminder(reminderId, payload);
        Taro.showToast({
          title: "提醒已更新",
          icon: "success",
          duration: 1500,
        });
      } else {
        await addReminder({
          ...payload,
          lastWechatReminderDate: "",
          lastWechatReminderAt: "",
          status: REMINDER_STATUS.ACTIVE,
          prescriptionHistory: [values.currentPrescriptionDate],
        });
        Taro.showToast({
          title: "提醒已创建",
          icon: "success",
          duration: 1500,
        });
      }

      onSuccess();
    } catch {
      Taro.showToast({
        title: "保存失败，请稍后重试",
        icon: "none",
        duration: 1800,
      });
    }
  };

  return (
    <View className="reminder-form">
      <View className="reminder-form__notice">
        <Text className="reminder-form__notice-title">
          保存后自动推算下次开药
        </Text>
        <Text className="reminder-form__notice-desc">
          系统会使用最近开药日期、间隔天数和提前提醒量生成下一次提醒。
        </Text>
      </View>

      <View className="reminder-form__field">
        <Text className="reminder-form__label">
          药物名称
          <Text className="reminder-form__required">*</Text>
        </Text>
        <View className="reminder-form__input-row">
          <Input
            className="reminder-form__input"
            value={values.medicineName}
            placeholder="例如：洛拉替尼"
            clearable
            onChange={(e: InputEvent) =>
              setField("medicineName", e.detail.value)
            }
          />
        </View>
      </View>

      <View className="reminder-form__field">
        <Text className="reminder-form__label">药物规格</Text>
        <View className="reminder-form__input-row">
          <Input
            className="reminder-form__input"
            value={values.medicineSpec}
            placeholder="例如：20mg"
            clearable
            onChange={(e: InputEvent) =>
              setField("medicineSpec", e.detail.value)
            }
          />
        </View>
      </View>

      <View className="reminder-form__grid">
        <View className="reminder-form__field">
          <Text className="reminder-form__label">
            最近开药日期
            <Text className="reminder-form__required">*</Text>
          </Text>
          <Picker
            mode="date"
            value={values.currentPrescriptionDate}
            onChange={(e: DatePickerEvent) =>
              setField("currentPrescriptionDate", e.detail.value)
            }
          >
            <View className="reminder-form__picker">
              <Text className="reminder-form__picker-text">
                {values.currentPrescriptionDate}
              </Text>
            </View>
          </Picker>
        </View>

        <View className="reminder-form__field">
          <Text className="reminder-form__label">
            下次开药间隔
            <Text className="reminder-form__required">*</Text>
          </Text>
          <Picker
            mode="selector"
            range={INTERVAL_OPTIONS.map((value) => `${value}天`)}
            value={intervalIndex}
            onChange={(e: SelectorPickerEvent) => {
              setField(
                "intervalDays",
                INTERVAL_OPTIONS[Number(e.detail.value)],
              );
            }}
          >
            <View className="reminder-form__picker">
              <Text className="reminder-form__picker-text">
                {values.intervalDays}天
              </Text>
            </View>
          </Picker>
        </View>
      </View>

      <View className="reminder-form__grid">
        <View className="reminder-form__field">
          <Text className="reminder-form__label">
            提前提醒
            <Text className="reminder-form__required">*</Text>
          </Text>
          <Picker
            mode="selector"
            range={BEFORE_OPTIONS.map((value) => `${value}天`)}
            value={beforeIndex}
            onChange={(e: SelectorPickerEvent) => {
              setField(
                "remindAdvanceDays",
                BEFORE_OPTIONS[Number(e.detail.value)],
              );
            }}
          >
            <View className="reminder-form__picker">
              <Text className="reminder-form__picker-text">
                {values.remindAdvanceDays}天
              </Text>
            </View>
          </Picker>
        </View>

        <View className="reminder-form__field">
          <Text className="reminder-form__label">
            提醒时间
            <Text className="reminder-form__required">*</Text>
          </Text>
          <Picker
            mode="time"
            value={values.remindTime}
            onChange={(e: TimePickerEvent) =>
              setField("remindTime", e.detail.value)
            }
          >
            <View className="reminder-form__picker">
              <Text className="reminder-form__picker-text">
                {values.remindTime}
              </Text>
            </View>
          </Picker>
        </View>
      </View>

      <View className="reminder-form__field">
        <Text className="reminder-form__label">备注</Text>
        <View className="reminder-form__textarea">
          <Textarea
            className="reminder-form__textarea-inner"
            value={values.note}
            placeholder="医院、复诊事项、注意事项"
            maxlength={200}
            onChange={(e: TextareaEvent) => setField("note", e.detail.value)}
          />
        </View>
      </View>

      <View className="reminder-form__calc">
        <Text>{calcText}</Text>
      </View>

      <Button
        className="reminder-form__submit"
        color="primary"
        onClick={handleSubmit}
      >
        {isEdit ? "保存修改" : "保存并开启提醒"}
      </Button>
    </View>
  );
}
