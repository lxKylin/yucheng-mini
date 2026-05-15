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
  name: string;
  spec: string;
  lastDate: string;
  time: string;
  interval: number;
  before: number;
  note: string;
}

function makeDefaults(): FormValues {
  const settings = loadSettings();

  return {
    name: "",
    spec: "",
    lastDate: today(),
    time: settings.defaultTime || DEFAULT_REMIND_TIME,
    interval: DEFAULT_INTERVAL,
    before: settings.defaultBefore || DEFAULT_BEFORE,
    note: "",
  };
}

type InputEvent = BaseEventOrig<{ value: string }>;
type TextareaEvent = BaseEventOrig<{ value: string }>;
type DatePickerEvent = BaseEventOrig<PickerDateProps.onChangeEventDetail>;
type SelectorPickerEvent = BaseEventOrig<PickerSelectorProps.ChangeEventDetail>;
type TimePickerEvent = BaseEventOrig<PickerTimeProps.onChangeEventDetail>;

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
        name: existingItem.name,
        spec: existingItem.spec,
        lastDate: existingItem.lastDate,
        time: existingItem.time,
        interval: existingItem.interval,
        before: existingItem.before,
        note: existingItem.note,
      });
      return;
    }

    if (!isEdit) {
      setValues(makeDefaults());
    }
  }, [existingItem, isEdit]);

  const calcText = useMemo(() => {
    const nextDate = calcNextDate(values.lastDate, values.interval);
    const remindDate = calcRemindDate(nextDate, values.before);
    return `预计下次开药日期为 ${nextDate}，提醒时间为 ${remindDate} ${values.time}`;
  }, [values.before, values.interval, values.lastDate, values.time]);

  const intervalIndex = useMemo(
    () =>
      Math.max(
        0,
        INTERVAL_OPTIONS.findIndex((value) => value === values.interval),
      ),
    [values.interval],
  );

  const beforeIndex = useMemo(
    () =>
      Math.max(
        0,
        BEFORE_OPTIONS.findIndex((value) => value === values.before),
      ),
    [values.before],
  );

  const setField = (field: keyof FormValues, value: string | number) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if (!values.name.trim()) {
      Taro.showToast({ title: "请填写药物名称", icon: "none", duration: 1500 });
      return;
    }

    if (values.interval < 1 || values.interval > 365) {
      Taro.showToast({
        title: "间隔天数需在 1-365 之间",
        icon: "none",
        duration: 1500,
      });
      return;
    }

    const payload = {
      name: values.name.trim(),
      spec: values.spec.trim(),
      lastDate: values.lastDate,
      time: values.time,
      interval: values.interval,
      before: values.before,
      note: values.note.trim(),
    };

    if (isEdit && reminderId) {
      updateReminder(reminderId, payload);
      Taro.showToast({ title: "提醒已更新", icon: "success", duration: 1500 });
    } else {
      addReminder({
        ...payload,
        status: "active",
        history: [values.lastDate],
      });
      Taro.showToast({ title: "提醒已创建", icon: "success", duration: 1500 });
    }

    onSuccess();
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
            value={values.name}
            placeholder="例如：洛拉替尼"
            clearable
            onChange={(e: InputEvent) => setField("name", e.detail.value)}
          />
        </View>
      </View>

      <View className="reminder-form__field">
        <Text className="reminder-form__label">药物规格</Text>
        <View className="reminder-form__input-row">
          <Input
            className="reminder-form__input"
            value={values.spec}
            placeholder="例如：20mg"
            clearable
            onChange={(e: InputEvent) => setField("spec", e.detail.value)}
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
            value={values.lastDate}
            onChange={(e: DatePickerEvent) =>
              setField("lastDate", e.detail.value)
            }
          >
            <View className="reminder-form__picker">
              <Text className="reminder-form__picker-text">
                {values.lastDate}
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
              setField("interval", INTERVAL_OPTIONS[Number(e.detail.value)]);
            }}
          >
            <View className="reminder-form__picker">
              <Text className="reminder-form__picker-text">
                {values.interval}天
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
              setField("before", BEFORE_OPTIONS[Number(e.detail.value)]);
            }}
          >
            <View className="reminder-form__picker">
              <Text className="reminder-form__picker-text">
                {values.before}天
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
            value={values.time}
            onChange={(e: TimePickerEvent) => setField("time", e.detail.value)}
          >
            <View className="reminder-form__picker">
              <Text className="reminder-form__picker-text">{values.time}</Text>
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
            autoHeight
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
